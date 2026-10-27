// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
package com.remind.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RemindSettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}