import AVKit
import CoreMedia
import CoreVideo
import ExpoModulesCore
import UIKit

public class PipModule: Module {
  private var session: PipSession?
  private var resignObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("Pip")
    Events("onModeChange")

    OnCreate {
      let observer = NotificationCenter.default.addObserver(
        forName: UIApplication.willResignActiveNotification,
        object: nil,
        queue: .main
      ) { _ in
        self.session?.handleResignActive()
      }
      self.resignObserver = observer
    }

    OnDestroy {
      if let resignObserver = self.resignObserver {
        NotificationCenter.default.removeObserver(resignObserver)
      }
      self.resignObserver = nil
      // OnDestroy runs on the JS thread during runtime recycle; UIKit teardown must hop to main.
      let session = self.session
      self.session = nil
      DispatchQueue.main.async {
        session?.stop()
      }
    }

    AsyncFunction("arm") {
      onMain {
        if self.session == nil {
          let session = PipSession()
          session.onModeChange = { [weak self] active in
            self?.sendEvent("onModeChange", ["active": active])
          }
          self.session = session
        }
        self.session?.start()
      }
    }

    AsyncFunction("disarm") {
      onMain {
        self.session?.stop()
        self.session = nil
      }
    }

    AsyncFunction("isActive") { () -> Bool in
      self.session?.isActive ?? false
    }

    AsyncFunction("setOverlay") { (rate: Double, receiving: Bool, history: [Double]) in
      onMain {
        self.session?.setOverlay(rate: rate, receiving: receiving, history: history)
      }
    }
  }
}

@available(iOS 15.0, *)
final class PipSession: NSObject, AVPictureInPictureControllerDelegate, AVPictureInPictureSampleBufferPlaybackDelegate {
  var onModeChange: ((Bool) -> Void)?
  private var pip: AVPictureInPictureController?
  private var displayLayer: AVSampleBufferDisplayLayer?
  private var hostView: UIView?
  private var timer: Timer?
  private var possibleObserver: NSKeyValueObservation?
  private var armed = false
  private var hideInApp = true
  private var frameIndex: Int64 = 0
  private var packetsPerSec: CGFloat = 0
  private var receiving = false
  private var rates: [CGFloat] = Array(repeating: 0, count: 48)

  var isActive: Bool {
    pip?.isPictureInPictureActive ?? false
  }

  func start() {
    armed = true
    if pip == nil {
      prepare()
    }
    placeHost()
    enqueueFrame()
  }

  func setOverlay(rate: Double, receiving: Bool, history: [Double]) {
    self.receiving = receiving
    packetsPerSec = CGFloat(rate)
    if history.isEmpty {
      rates.removeFirst()
      rates.append(packetsPerSec)
    } else {
      let tail = history.suffix(rates.count).map { CGFloat($0) }
      rates = Array(repeating: 0, count: max(0, rates.count - tail.count)) + tail
    }
    enqueueFrame(force: true)
  }

  func handleResignActive() {
    guard armed else { return }
    hideInApp = false
    placeHost()
    enqueueFrame(force: true)
    startNow()
  }

  func stop() {
    if !Thread.isMainThread {
      DispatchQueue.main.async { [self] in
        self.stop()
      }
      return
    }
    armed = false
    timer?.invalidate()
    timer = nil
    possibleObserver?.invalidate()
    possibleObserver = nil
    pip?.stopPictureInPicture()
    pip = nil
    displayLayer = nil
    hostView?.removeFromSuperview()
    hostView = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }

  private func prepare() {
    let audio = AVAudioSession.sharedInstance()
    try? audio.setCategory(.playback, mode: .moviePlayback, options: [.mixWithOthers])
    try? audio.setActive(true)

    let host = UIView(frame: CGRect(x: 0, y: 0, width: 160, height: 90))
    host.isUserInteractionEnabled = false
    host.backgroundColor = UIColor(red: 0.05, green: 0.07, blue: 0.09, alpha: 1)
    host.clipsToBounds = true
    let layer = AVSampleBufferDisplayLayer()
    layer.frame = host.bounds
    layer.videoGravity = .resizeAspectFill
    host.layer.addSublayer(layer)

    hostView = host
    displayLayer = layer
    placeHost()
    for _ in 0 ..< 8 {
      enqueueFrame(force: true)
    }

    guard AVPictureInPictureController.isPictureInPictureSupported() else { return }

    let source = AVPictureInPictureController.ContentSource(sampleBufferDisplayLayer: layer, playbackDelegate: self)
    let controller = AVPictureInPictureController(contentSource: source)
    controller.delegate = self
    controller.requiresLinearPlayback = true
    controller.canStartPictureInPictureAutomaticallyFromInline = true
    pip = controller
    possibleObserver = controller.observe(\.isPictureInPicturePossible, options: [.initial, .new]) { [weak self] _, _ in
      DispatchQueue.main.async { self?.startNowIfLeaving() }
    }

    timer?.invalidate()
    let timer = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in
      self?.enqueueFrame(force: true)
      self?.placeHost()
    }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
  }

  private func placeHost() {
    guard let host = hostView, let window = keyWindow() else { return }
    if host.superview !== window {
      host.removeFromSuperview()
      window.addSubview(host)
    }
    host.frame = CGRect(x: 0, y: 0, width: 160, height: 90)
    displayLayer?.frame = host.bounds
    host.alpha = hideInApp && !isActive ? 0 : 1
  }

  private func startNowIfLeaving() {
    guard armed, UIApplication.shared.applicationState != .active else { return }
    startNow()
  }

  private func startNow() {
    guard armed, let controller = pip, !controller.isPictureInPictureActive else { return }
    controller.startPictureInPicture()
  }

  private func enqueueFrame(force: Bool = false) {
    guard let layer = displayLayer, let buffer = makeBuffer() else { return }
    if #available(iOS 17.0, *) {
      if force || layer.sampleBufferRenderer.isReadyForMoreMediaData {
        layer.sampleBufferRenderer.enqueue(buffer)
      }
    } else if force || layer.isReadyForMoreMediaData {
      layer.enqueue(buffer)
    }
  }

  func pictureInPictureControllerDidStartPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
    onModeChange?(true)
  }

  func pictureInPictureControllerDidStopPictureInPicture(_ pictureInPictureController: AVPictureInPictureController) {
    hideInApp = true
    placeHost()
    onModeChange?(false)
  }

  func pictureInPictureController(
    _ pictureInPictureController: AVPictureInPictureController,
    failedToStartPictureInPictureWithError error: Error
  ) {
    onModeChange?(false)
  }

  func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, setPlaying playing: Bool) {}
  func pictureInPictureControllerTimeRangeForPlayback(_ pictureInPictureController: AVPictureInPictureController) -> CMTimeRange {
    CMTimeRange(start: .zero, duration: .positiveInfinity)
  }
  func pictureInPictureControllerIsPlaybackPaused(_ pictureInPictureController: AVPictureInPictureController) -> Bool { false }
  func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, didTransitionToRenderSize newRenderSize: CMVideoDimensions) {}
  func pictureInPictureController(_ pictureInPictureController: AVPictureInPictureController, skipByInterval skipInterval: CMTime, completion completionHandler: @escaping () -> Void) {
    completionHandler()
  }

  private func makeBuffer() -> CMSampleBuffer? {
    let size = CGSize(width: 320, height: 180)
    UIGraphicsBeginImageContextWithOptions(size, true, 1)
    drawOverlay()
    let image = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    guard let cgImage = image?.cgImage else { return nil }

    var pixelBuffer: CVPixelBuffer?
    let attrs: [CFString: Any] = [
      kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary,
      kCVPixelBufferCGImageCompatibilityKey: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey: true,
    ]
    CVPixelBufferCreate(kCFAllocatorDefault, 320, 180, kCVPixelFormatType_32BGRA, attrs as CFDictionary, &pixelBuffer)
    guard let pixelBuffer else { return nil }
    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    if let context = CGContext(
      data: CVPixelBufferGetBaseAddress(pixelBuffer),
      width: 320,
      height: 180,
      bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) {
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: 320, height: 180))
    }
    CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
    var format: CMVideoFormatDescription?
    CMVideoFormatDescriptionCreateForImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: pixelBuffer, formatDescriptionOut: &format)
    guard let format else { return nil }
    frameIndex += 1
    var timing = CMSampleTimingInfo(
      duration: CMTime(value: 1, timescale: 4),
      presentationTimeStamp: CMTime(value: frameIndex, timescale: 4),
      decodeTimeStamp: .invalid
    )
    var sample: CMSampleBuffer?
    CMSampleBufferCreateForImageBuffer(
      allocator: kCFAllocatorDefault,
      imageBuffer: pixelBuffer,
      dataReady: true,
      makeDataReadyCallback: nil,
      refcon: nil,
      formatDescription: format,
      sampleTiming: &timing,
      sampleBufferOut: &sample
    )
    return sample
  }

  private func drawOverlay() {
    let bounds = CGRect(x: 0, y: 0, width: 320, height: 180)
    UIColor(red: 0.05, green: 0.07, blue: 0.09, alpha: 1).setFill()
    UIRectFill(bounds)
    let accent = UIColor(red: 0.88, green: 0.02, blue: 0, alpha: 1)
    let title = "\(Int(packetsPerSec.rounded()))/s  \(receiving ? "Receiving" : "Waiting")" as NSString
    title.draw(in: CGRect(x: 12, y: 8, width: 296, height: 28), withAttributes: [
      .font: UIFont.monospacedDigitSystemFont(ofSize: 22, weight: .semibold),
      .foregroundColor: accent,
    ])
    let chart = CGRect(x: 12, y: 40, width: 296, height: 80)
    UIColor(white: 0.16, alpha: 1).setFill()
    UIRectFill(chart)
    accent.setStroke()
    UIRectFrame(chart)
    let peak = max(1, rates.max() ?? 1)
    let n = CGFloat(max(1, rates.count))
    let gap: CGFloat = 1
    let barW = (chart.width - gap * (n - 1)) / n
    accent.setFill()
    for (index, rate) in rates.enumerated() {
      let height = max(4, (rate / peak) * (chart.height - 4))
      let x = chart.minX + CGFloat(index) * (barW + gap)
      UIRectFill(CGRect(x: x, y: chart.maxY - height, width: max(1, barW), height: height))
    }
    let caption = "Keep this window open. Packets cannot be received in the background." as NSString
    caption.draw(in: CGRect(x: 12, y: 126, width: 296, height: 46), withAttributes: [
      .font: UIFont.systemFont(ofSize: 11, weight: .medium),
      .foregroundColor: UIColor(white: 0.82, alpha: 1),
    ])
  }
}

private func keyWindow() -> UIWindow? {
  let windows = UIApplication.shared.connectedScenes
    .compactMap { $0 as? UIWindowScene }
    .flatMap { $0.windows }
  return windows.first { $0.isKeyWindow } ?? windows.first { $0.windowLevel == .normal && !$0.isHidden }
}

private func onMain(_ work: @escaping () -> Void) {
  if Thread.isMainThread {
    work()
  } else {
    DispatchQueue.main.sync(execute: work)
  }
}
