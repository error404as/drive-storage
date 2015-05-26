# vapp
Vapp - Google Drive data saving

# Description
- saving `Vapp.data` to Drive or localy
- if Google Drive file not defined - saves to `localStorage[Vapp.dataKey]`
- selected Google Drive file id/title saved to `localStorage[Vapp.stateKey]` (`Vapp.options`)
- create Google Drive file with selected name is it doesn't exist, update it if exist (warning if user types name of existing file)
- saved data is awailable in localStorage after disabling saving to Google Drive

# Useful links
https://developers.google.com/drive/web/quickstart/quickstart-js
https://developers.google.com/drive/v2/reference/files/get
https://developers.google.com/drive/v2/reference/files/update

