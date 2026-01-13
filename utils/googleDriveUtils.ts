
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
 * Creates a new folder in Google Drive.
 */
export async function createFolderInDrive(
  name: string,
  parentId: string,
  accessToken: string
): Promise<string> {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create folder ${name}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Searches for a folder by name within a parent folder.
 */
export async function findFolderInDrive(
  name: string,
  parentId: string,
  accessToken: string
): Promise<string | null> {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) return null;
  const data = await response.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/**
 * Ensures a folder hierarchy exists given a relative path (e.g., "Day 1/Morning").
 * Returns the ID of the final folder.
 */
export async function ensureFolderHierarchy(
  path: string,
  rootFolderId: string,
  accessToken: string
): Promise<string> {
  const parts = path.split('/').filter(p => p && p !== '.');
  let currentParentId = rootFolderId;

  for (const part of parts) {
    let folderId = await findFolderInDrive(part, currentParentId, accessToken);
    if (!folderId) {
      folderId = await createFolderInDrive(part, currentParentId, accessToken);
    }
    currentParentId = folderId;
  }

  return currentParentId;
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
