// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
package io.github.stahpps.remind;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

// Android's document picker grants access only to the file chosen by the user.
// No storage permission or private file path is exposed to the web layer.
@CapacitorPlugin(name = "RemindBackup")
public class RemindBackupPlugin extends Plugin {
    private static final int MAX_BYTES = 5 * 1024 * 1024;

    @PluginMethod
    public void exportBackup(PluginCall call) {
        String contents = call.getString("contents");
        if (contents == null || contents.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            call.reject("Invalid backup size");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "remind-events.json"));
        try { startActivityForResult(call, intent, "exportResult"); }
        catch (ActivityNotFoundException e) { call.reject("No document picker available", e); }
    }

    @ActivityCallback
    private void exportResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(data.getData(), "wt")) {
            if (stream == null) throw new java.io.IOException("No output stream");
            String contents = call.getString("contents");
            if (contents == null) throw new java.io.IOException("Missing backup contents");
            stream.write(contents.getBytes(StandardCharsets.UTF_8));
            stream.flush();
        } catch (Exception e) {
            call.reject("Could not save backup", e);
            return;
        }
        call.resolve(new JSObject().put("cancelled", false));
    }

    @PluginMethod
    public void importBackup(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "application/json", "text/plain", "application/octet-stream" });
        try { startActivityForResult(call, intent, "importResult"); }
        catch (ActivityNotFoundException e) { call.reject("No document picker available", e); }
    }

    @ActivityCallback
    private void importResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        try (InputStream stream = getContext().getContentResolver().openInputStream(data.getData());
             ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            if (stream == null) throw new java.io.IOException("No input stream");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) {
                if (bytes.size() + count > MAX_BYTES) throw new java.io.IOException("Backup exceeds 5 MB");
                bytes.write(buffer, 0, count);
            }
            call.resolve(new JSObject().put("cancelled", false)
                .put("contents", new String(bytes.toByteArray(), StandardCharsets.UTF_8)));
        } catch (Exception e) { call.reject("Could not read backup", e); }
    }
}
