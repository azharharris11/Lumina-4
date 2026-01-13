# Development Roadmap: Feature Gaps & Enhancements

## Phase 1 - 3: Completed Features ✅
*(Detail diarsipkan untuk fokus pada stabilitas)*

---

## Phase 4: Bug Squashing & Stability (ACTIVE 🛠️)

### 1. Critical UI Fixes
* **Bug:** `Uncaught ReferenceError: handleSubmitSelection is not defined`.
    * **Penyebab:** Fungsi terhapus saat implementasi Feedback tab.
    * **Solusi:** Kembalikan fungsi `handleSubmitSelection` ke `ClientPortal.tsx`.
* **Bug:** Kanban Board Production tidak bisa Drag & Drop.
    * **Penyebab:** Kemungkinan library `dnd-kit` atau `react-beautiful-dnd` belum terkonfigurasi benar atau logic `onDragEnd` hilang.
    * **Solusi:** Perbaiki logic `onDragEnd` di `ProductionView.tsx`.

### 2. Backend & Security Fixes
* **Bug:** `FirebaseError: Missing or insufficient permissions` pada Notifications.
    * **Penyebab:** Firestore Rules belum mengizinkan akses ke koleksi `notifications` dan `internal_reviews`.
    * **Solusi:** Perbarui `firestore.rules`.
* **Bug:** `proxyWatermarkedImage` Error 500/503.
    * **Penyebab:** 
        1. Project ID hardcoded salah.
        2. `sharp` gagal memproses stream.
        3. Secrets belum terpasang di Cloud Run.
    * **Solusi:** Gunakan dynamic Project ID dan debug stream pipe di Cloud Functions.

### 3. Build & Optimization
* **Bug:** Tailwind CDN Warning.
    * **Solusi:** Migrasi dari CDN ke proper NPM setup (Tailwind Vite Plugin).
* **Bug:** Sinkronisasi jumlah (count) di portal tidak akurat.
    * **Solusi:** Periksa logic state `proofingData` dan `selectedPhotos`.

---

## Action Plan:
1. [ ] Fix `ClientPortal.tsx` (Restore missing functions & accurate counting).
2. [ ] Fix Firestore Rules.
3. [ ] Fix `ProductionView.tsx` (Kanban stability).
4. [ ] Fix Backend `proxyWatermarkedImage` logic.
5. [ ] Fix Tailwind setup.