
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
