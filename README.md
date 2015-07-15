# DriveStorage
DriveStorage - Google Drive data saving

# Description
- use DriveStorage.save(somedata) to save `somedata` var to Google Drive
- use DriveStorage.get() to receive data from Google Drive. You'll receive it in DriveStorage.callback.loaded callback as the first argument
- on saving you can enter a file name or select one with a picker
- creates Google Drive file with selected name is it doesn't exist, update it if exist (warning if user types name of existing file)
- if file with selected name is in Trash, file will be restored/untrashed

# Useful links
https://developers.google.com/drive/web/quickstart/quickstart-js
https://developers.google.com/drive/v2/reference/files/get
https://developers.google.com/drive/v2/reference/files/update

