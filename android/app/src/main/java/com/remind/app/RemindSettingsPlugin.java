package com.remind.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.os.Build;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.annotation.RequiresApi;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;

@CapacitorPlugin(name = "RemindSettings")
public class RemindSettingsPlugin extends Plugin {
    private static final String CHANNEL_ID = "default";

    @RequiresApi(Build.VERSION_CODES.O)
    private NotificationChannel ensureChannel() {
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
        if (channel == null) {
            channel = new NotificationChannel(CHANNEL_ID, "Remind", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        }
        // Updating the name preserves the user's sound, importance and other preferences.
        channel.setName("Remind");
        manager.createNotificationChannel(channel);
        return manager.getNotificationChannel(CHANNEL_ID);
    }

    private JSObject soundState() {
        JSObject result = new JSObject();
        boolean supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O;
        result.put("supported", supported);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return result;
        NotificationChannel channel = ensureChannel();
        boolean silent = channel.getSound() == null;
        result.put("silent", silent);
        result.put("enabled", channel.getImportance() != NotificationManager.IMPORTANCE_NONE);
        String title = "";
        if (!silent) {
            try {
                Ringtone ringtone = RingtoneManager.getRingtone(getContext(), channel.getSound());
                if (ringtone != null) title = ringtone.getTitle(getContext());
            } catch (Exception ignored) { }
        }
        result.put("title", title);
        return result;
    }

    @PluginMethod
    public void getNotificationSound(PluginCall call) {
        try { call.resolve(soundState()); }
        catch (Exception error) { call.reject("Could not read notification sound settings", error); }
    }

    @PluginMethod
    public void openNotificationSound(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            call.unavailable("Per-app sound selection requires Android 8 or newer");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                ensureChannel();
                Intent intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
                intent.putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL_ID);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    intent.putStringArrayListExtra(Settings.EXTRA_CHANNEL_FILTER_LIST,
                        new ArrayList<>(Collections.singletonList(NotificationChannel.EDIT_SOUND)));
                }
                startActivityForResult(call, intent, "soundSettingsResult");
            } catch (ActivityNotFoundException error) {
                call.reject("Android notification settings are unavailable", error);
            } catch (Exception error) {
                call.reject("Could not open notification sound settings", error);
            }
        });
    }

    @ActivityCallback
    private void soundSettingsResult(PluginCall call, ActivityResult result) {
        if (call != null) {
            try { call.resolve(soundState()); }
            catch (Exception error) { call.reject("Could not refresh notification sound settings", error); }
        }
    }
}