// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Stahpps
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({ plugins: [react(), tailwindcss()] })

