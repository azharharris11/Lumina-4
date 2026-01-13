
/**
 * Utilities for Google Drive Integration
 */

export interface DriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  mimeType: string;
}

/**
 * Uploads a file to Google Drive using the Multipart upload method.
 * @param file The standard File object from input.
 * @param folderId The ID of the parent folder in Google Drive.
 * @param accessToken The valid OAuth2 access token.
 * @returns Promise resolving to the uploaded file metadata.
 */
export async function uploadToGoogleDrive(
  file: File,
  folderId: string,
  accessToken: string
): Promise<DriveFile> {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive Upload Failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Shares a file or folder with a specific email address.
 * @param folderId The ID of the file or folder to share.
 * @param email The email address of the recipient.
 * @param accessToken The valid OAuth2 access token.
 * @param role The role to grant ('reader', 'writer', 'commenter'). Default is 'reader'.
 */
export async function shareFolderWithEmail(
  folderId: string,
  email: string,
  accessToken: string,
  role: 'reader' | 'writer' | 'commenter' = 'reader'
): Promise<any> {
  const body = {
    role: role,
    type: 'user',
    emailAddress: email,
  };

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive Share Failed: ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}
