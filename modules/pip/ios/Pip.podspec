require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name = "Pip"
  s.version = package["version"]
  s.summary = package["description"]
  s.description = package["description"]
  s.license = package["license"]
  s.author = package["author"]
  s.homepage = package["homepage"]
  s.platforms = { :ios => "16.4" }
  s.swift_version = "5.9"
  s.source = { :git => "https://github.com/mferranti/f1-hotlaps.git" }
  s.static_framework = true
  s.dependency "ExpoModulesCore"
  s.frameworks = "AVKit", "AVFoundation", "UIKit"
  s.source_files = "**/*.{h,m,mm,swift}"
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "SWIFT_COMPILATION_MODE" => "wholemodule"
  }
end
