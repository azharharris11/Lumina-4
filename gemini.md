# Plan: Switch to Google Drive for File Storage

## Objective
Replace Firebase Storage with the user's connected Google Drive for storing project files to reduce costs.

## Context
- **Current State**: 
  - `ProjectFiles.tsx` uploads files to Firebase Storage (`projects/{bookingId}/{filename}`).
  - `ProjectDrivePicker.tsx` allows selecting a Google Drive folder.
  - `googleIntegration.ts` handles OAuth with scope `drive.file`.
- **Goal**:
  - Uploads initiated in `ProjectFiles` should go to the linked Google Drive folder.
  - File metadata (link, name, id) should still be stored in Firestore (`booking.files`) for UI consistency, but the binary data resides in Drive.

## Step-by-Step Implementation

### 1. Data Model Updates
Ensure the `Booking` object can store the Drive Folder ID reliably.
- We already use `booking.deliveryUrl`. We should ensure we also store `booking.driveFolderId` when a folder is selected in `ProjectDrivePicker`.

### 2. Google Drive Upload Logic
Create a utility function to upload files directly to Google Drive from the browser using the stored `accessToken`.

**New Utility: `utils/googleDriveUtils.ts`**
- `uploadToGoogleDrive(file: File, folderId: string, accessToken: string)`:
  - Uses `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`.
  - Metadata: `{ name: file.name, parents: [folderId] }`.
  - Body: Multipart (Metadata + File Content).
  - Returns: Google Drive File Object (id, name, webViewLink, webContentLink).

### 3. Refactor `ProjectFiles.tsx`
Modify the `handleUploadToStorage` function.

- **Check Connection**: Ensure User has Google connected (`currentUser.isGoogleConnected` or check if we have a token).
- **Check Folder**: Ensure `booking.driveFolderId` exists. If not, prompt user to "Link Drive Folder" first.
- **Upload Flow**:
  1.  Retrieve `accessToken` (might need to refresh if expired - see `googleIntegration` logic).
      - *Note*: `googleIntegration.ts` stores tokens in Firestore. We might need a cloud function or a client-side fetch to get a fresh token if the client doesn't have it handy. `ProjectDrivePicker` accepts `googleToken` as a prop, suggesting the parent component holds it.
  2.  Call `uploadToGoogleDrive`.
  3.  On success, construct a `BookingFile` object:
      ```typescript
      {
        id: driveFile.id,
        name: driveFile.name,
        url: driveFile.webViewLink, // Link to Drive
        type: 'DELIVERABLE', // or 'DRIVE_FILE'
        uploadedAt: new Date().toISOString(),
        source: 'GOOGLE_DRIVE' // New field to distinguish
      }
      ```
  4.  Update Firestore via `onUpdateBooking`.

### 4. Token Management
- `ProjectFiles` needs access to the Google Access Token.
- Currently `AuthContext` or `StudioContext` might need to expose this, or we fetch it when the component mounts if the user is connected.
- *Action*: Check where `googleToken` comes from in `ProjectDrivePicker` usage (likely `ProjectDrawer.tsx` or `ProjectDrivePicker` parent).

### 5. Cleanup
- Remove usage of `uploadFile` (Firebase Storage) from `ProjectFiles.tsx` once Drive upload is working.
- Optionally, allow users to migrate existing files (out of scope for now, focus on new uploads).

## User Experience
1. User opens Project -> Files.
2. If no folder linked -> "Link Google Drive Folder" (opens Picker).
3. User selects/creates folder.
4. "Upload File" button becomes active.
5. User selects file -> Uploads to Drive -> Appears in list.
6. Clicking file opens Google Drive viewer.

## Potential Issues & Solutions
- **Scope**: `drive.file` only allows access to files created by the app.
  - *Mitigation*: The "Link Folder" flow must ensure the app "knows" about the folder. If the user picks a folder via our custom `ProjectDrivePicker` (which uses the API with the same token), the app *should* be able to write to it if the token is valid.
- **CORS**: Google Drive API supports CORS for uploads.

## Tasks
1.  [x] Create `utils/googleDriveUtils.ts` for upload logic.
2.  [x] Update `ProjectFiles.tsx` to accept `googleToken` and `driveFolderId`.
3.  [x] Implement the new upload handler.
4.  [x] Test with a real Google Account.
