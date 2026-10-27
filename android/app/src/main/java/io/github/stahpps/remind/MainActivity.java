// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
package io.github.stahpps.remind;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RemindSettingsPlugin.class);
        registerPlugin(RemindBackupPlugin.class);
        super.onCreate(savedInstanceState);
    }
}