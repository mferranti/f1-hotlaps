package expo.modules.pip

import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PipModule : Module() {
  private var armed = false

  override fun definition() = ModuleDefinition {
    Name("Pip")
    Events("onModeChange")

    AsyncFunction("arm") {
      armed = true
      applyParams(autoEnter = true)
    }

    AsyncFunction("disarm") {
      armed = false
      applyParams(autoEnter = false)
    }

    AsyncFunction("isActive") {
      appContext.currentActivity?.isInPictureInPictureMode ?: false
    }

    AsyncFunction("setOverlay") { _: Double, _: Boolean, _: List<Double> -> }

    OnActivityEntersForeground {
      if (armed) applyParams(autoEnter = true)
      sendEvent("onModeChange", mapOf("active" to (appContext.currentActivity?.isInPictureInPictureMode ?: false)))
    }

    OnUserLeavesActivity {
      enterIfNeeded()
    }
  }

  private fun pipParams(autoEnter: Boolean): PictureInPictureParams {
    return PictureInPictureParams.Builder()
      .setAspectRatio(Rational(16, 9))
      .apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          setAutoEnterEnabled(autoEnter)
        }
      }
      .build()
  }

  private fun applyParams(autoEnter: Boolean) {
    val activity = appContext.currentActivity ?: return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    activity.runOnUiThread {
      activity.setPictureInPictureParams(pipParams(autoEnter))
    }
  }

  private fun enterIfNeeded() {
    if (!armed) return
    val activity = appContext.currentActivity ?: return
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (activity.isInPictureInPictureMode) return
    activity.runOnUiThread {
      val params = pipParams(autoEnter = true)
      activity.setPictureInPictureParams(params)
      try {
        activity.enterPictureInPictureMode(params)
      } catch (_: IllegalStateException) {
      }
    }
  }
}
