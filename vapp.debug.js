/*
 - saving Vapp.data to Drive
 - create Google Drive file with selected name is it doesn't exist, update it if exist (warning if user types name of existing file)

Used google tutorial examples:
https://developers.google.com/drive/web/quickstart/quickstart-js
https://developers.google.com/drive/v2/reference/files/get
https://developers.google.com/drive/v2/reference/files/update

 */
// lines with /*debug_remove*/ should be removed

var DriveStorage = (function(){

  return {};
})();

var Vapp = {
  gapiLoading: false,
  data: null,
  helper: null, // 'save', 'load'
  doLater: null,
  options: {
    /*
    dr_id: "0B-UCMEm2hwO7bzNTRmNXdGdaRm8",
    dr_title: "sample.json"
    */
  },
  init: function() {
    Vapp.ui.add();
    Vapp.auth.loadGapi('vapp_clientLoad');
  },
  reset: function(){
    Vapp.options = {};
    Vapp.data = null;
    Vapp.doLater = null;
    Vapp.ui.hidePopup();
    Vapp.ui.lockScreen(false);
  },
  isReady: function(){
    Vapp.ui.add();
    if(typeof gapi === 'undefined' && !Vapp.gapiLoading){
      Vapp.auth.loadGapi('vapp_clientLoad');
      return false;
    } else if(!gapi.client.drive){
      Vapp.auth.checkAuth();
      return false;
    }
    return true;
  },
  getData: function(){
    Vapp.ui.trace('getData'); /*debug_remove*/
    if(!Vapp.isReady()){
      Vapp.doLater = function(){ Vapp.getData(); };
      return;
    }
    Vapp.helper = 'load';
    Vapp.drive.getDataFromDrive();
  },
  saveData: function(data) {
    var _ui = Vapp.ui,
        _d = Vapp.drive;

    Vapp.data = data || Vapp.data;
    if(!Vapp.isReady()){
      Vapp.doLater = function(){ Vapp.saveData(); };
      return;
    }
    Vapp.helper = 'save';

    _ui.trace('saveData'); /*debug_remove*/
    _ui.hidePopup();

    _ui.lockScreen(true, 'Saving app data');
    _d.getFileMetadata();
    if(!_d.metadata){
      _ui.showPopup('new'); // ask to select file for saving
      _ui.reporter('Saving canceled. File name is required.'); /*debug_remove*/
      _ui.lockScreen(false);
      return false;
    }
    _d.checkFileExists(_d.metadata.title, _d.saveDataHandle);
  }
};

Vapp.auth = {
  loadGapi: function(callback){
    callback = callback || 'vapp_clientLoad';
    Vapp.ui.trace('loadGapi'); /*debug_remove*/
    Vapp.gapiLoading = true;
    Vapp.ui.lockScreen(true, 'Loading Google API');
    var script = document.createElement('script');
    script.src = 'https://apis.google.com/js/client.js?onload='+callback;
    document.getElementsByTagName('head')[0].appendChild(script);
  },
  handleClientLoad: function() {
    Vapp.ui.trace('handleClientLoad'); /*debug_remove*/
    window.setTimeout(Vapp.auth.checkAuth, 1);
  },
  checkAuth: function() {
    Vapp.ui.lockScreen(true, 'Authorization with Google');
    Vapp.ui.trace('checkAuth'); /*debug_remove*/
    gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true}, Vapp.auth.handleAuthResult);
  },
  checkAuth2: function(){
    if(!gapi.auth.getToken()){
      gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false}, Vapp.auth.handleAuthResult);
    }
  },
  handleAuthResult: function(authResult) {
    var _ui = Vapp.ui,
        _o = Vapp.options;

    _ui.trace('handleAuthResult'); /*debug_remove*/
    _ui.lockScreen(false);
    if(authResult && !authResult.error) {
      Vapp.callback.authOK();
      _ui.lockScreen(true, 'Loading Google Drive API');
      gapi.client.load('drive', 'v2', function(){
        gapi.load('picker', function(){
          _ui.lockScreen(false);
          Vapp.callback.driveOK();
          if(typeof Vapp.doLater === 'function'){ Vapp.doLater(); Vapp.doLater = null; }
        });
      });
    } else {
      Vapp.auth.checkAuth2();
    }
  }
};

// Vapp.auth.handleClientLoad don't work in url callback path
var vapp_clientLoad = function() {
  Vapp.auth.handleClientLoad();
};

Vapp.ui = {
  /*debug_remove*/  trace: function(msg, data){
  /*debug_remove*/    if(data){
  /*debug_remove*/      console.log('->' + msg, data);
  /*debug_remove*/    } else {
  /*debug_remove*/      console.log('->' + msg);
  /*debug_remove*/    }
  /*debug_remove*/  },
  /*debug_remove*/  reporter: function(msg, data){
  /*debug_remove*/    console.log(msg);
  /*debug_remove*/    if(data){
  /*debug_remove*/      if(typeof data === 'object' || typeof data === 'string'){
  /*debug_remove*/        console.log(data);
  /*debug_remove*/      } else {
  /*debug_remove*/        console.log(Vapp.data);
  /*debug_remove*/      }
  /*debug_remove*/    }
  /*debug_remove*/  },
  add: function(){
    if($('.drivesave-overlay').length){ return; }
    var code = '<div class="drivesave-overlay"><!----></div>'
      +'<div class="drivesave-popup" id="drivesave-new">'
        +'<i class="ico-close">close</i>'
        +'<br>'
        +'Create file on Drive: <input type="text" id="drivesave-fname" value=""> <input type="button" onclick="Vapp.drive.addNewFile()" value="Create">'
        +'<br><br>'
        +'Or: <input type="button" onclick="Vapp.drive.createPicker()" value="Select file on Drive to rewrite">'
      +'</div>'
      +'<div class="drivesave-popup tcenter" id="drivesave-exists">'
        +'File with this name already exists. Do you want to use it anyway?<br>'
        +'<span class="msg"></span><br><br>'
        +'<input type="button" onclick="Vapp.saveData()" value="Sure"> <input type="button" onclick="Vapp.drive.addNewExistsBack()" value="Back">'
      +'</div>';
    $('body').append(code);
    $('.drivesave-popup .ico-close').on('click', Vapp.reset);
  },
  lockScreen: function(trig, msg){
    Vapp.ui.trace('lockScreen', trig); /*debug_remove*/
    if(trig){
      $('body').addClass('drivesave-locked');
      if(msg){
        $('body').attr('lockmsg', msg);
      }
    } else {
      $('body').removeClass('drivesave-locked').removeAttr('lockmsg');
    }
  },
  hidePopup: function(){
    Vapp.ui.trace('hidePopup'); /*debug_remove*/
    $('.drivesave-overlay, .drivesave-popup').hide();
  },
  showPopup: function(name){
    Vapp.ui.trace('showPopup',name); /*debug_remove*/
    var $pop = name ? $('#drivesave-'+name) : null;
    if($pop && $pop.length){
      $('.drivesave-overlay').show();
      $('.drivesave-popup').hide();
      $('#drivesave-'+name).show();
      if(name === 'new'){
        $('#drivesave-fname').focus();
        //Vapp.auth.checkAuth2();
      }
    }
  },
  existsMsg: function(msg){
    $('#drivesave-exists .msg').html(msg);
  }

};

Vapp.drive = {
  metadata: {},
  getFileMetadata: function() {
    Vapp.ui.trace('getFileMetadata'); /*debug_remove*/
    if(Vapp.options.dr_title){
      this.metadata = {
        'title': Vapp.options.dr_title,
        'mimeType': 'application/json'
      }
    } else {
      this.metadata = null;
    }
  },
  saveDataHandle: function(fl) {
    Vapp.ui.trace('saveDataHandle',fl); /*debug_remove*/
    if(fl && fl.id){
      Vapp.ui.reporter('File already exists...'); /*debug_remove*/
      Vapp.drive.saveToFile(fl.id);
    } else {
      Vapp.ui.reporter('Will create a new file...'); /*debug_remove*/
      Vapp.drive.saveToFile();
    }
  },
  saveToFile: function(fileId) {
    var _ui = Vapp.ui,
        _meta = Vapp.drive.metadata,
        _o = Vapp.options;

    _ui.trace('saveToFile',fileId); /*debug_remove*/

    /*debug_remove*/  if(fileId){
    /*debug_remove*/    // update
    /*debug_remove*/    _ui.reporter('Updating file ('+_meta.title+') with data:', 1);
    /*debug_remove*/  } else {
    /*debug_remove*/    // create
    /*debug_remove*/    _ui.reporter('Creating a new file ('+_meta.title+') with data:', 1);
    /*debug_remove*/  }

    const boundary = '-------314159265358979323846264';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    var savingData = typeof Vapp.data === 'string' ? Vapp.data : JSON.stringify(Vapp.data);
    var safeString = unescape(encodeURIComponent(savingData))
    var base64Data = btoa(safeString);
    var multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(_meta) +
        delimiter +
        'Content-Type: application/json\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        base64Data +
        close_delim;

    if(fileId){
      // update
      var request = gapi.client.request({
          'path': '/upload/drive/v2/files/' + fileId,
          'method': 'PUT',
          'params': {'uploadType': 'multipart', 'alt': 'json'},
          'headers': {
            'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
          },
          'body': multipartRequestBody});
      var _debugMsg = 'File successfully updated!'; /*debug_remove*/
    } else {
      // create
      var request = gapi.client.request({
          'path': '/upload/drive/v2/files',
          'method': 'POST',
          'params': {'uploadType': 'multipart'},
          'headers': {
            'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
          },
          'body': multipartRequestBody});
      var _debugMsg = 'New file created! Fileinfo:'; /*debug_remove*/
    }
    request.execute(function(res) {
      _ui.reporter(_debugMsg, res); /*debug_remove*/
      if(_o.trash){
        Vapp.drive.restoreFromTrash(fileId);
      }
      Vapp.reset();
      Vapp.callback.dataSaved();
    });
  },
  restoreFromTrash: function(id){
    var _ui = Vapp.ui;
    var request = gapi.client.drive.files.untrash({
      'fileId': id
    });
    _ui.trace('restoreFromTrash',id); /*debug_remove*/
    request.execute(function(resp) {
      _ui.trace('restored from Trash!'); /*debug_remove*/
    });
  },
  checkFileExists: function(fname, callback){
    Vapp.ui.trace('checkFileExists', fname); /*debug_remove*/
    Vapp.ui.reporter('Looking for: ' + fname); /*debug_remove*/

    var req = gapi.client.drive.files.list({q: "title='"+fname+"'"});
    req.execute(function(r){
      console.log(r);
      if(typeof callback !== 'function') { return; }
      var len = r.items ? r.items.length : 0;
      if(r.items && r.items.length && r.items[0].id){
        callback(r.items[0]);
      } else {
        callback();
      }
    });
  },
  createPicker: function(){
    Vapp.ui.trace('createPicker'); /*debug_remove*/
    if(!gapi.auth.getToken()){
      Vapp.auth.checkAuth2();
      return;
    }
    if(typeof google === 'undefined'){
      Vapp.auth.checkAuth();
      return;
    }
    var accessToken = gapi.auth.getToken().access_token;
    var picker = new google.picker.PickerBuilder()
          .addView(new google.picker.DocsView().setIncludeFolders(true).setMode(google.picker.DocsViewMode.LIST))
          //.addView(new google.picker.DocsUploadView())
          .enableFeature(google.picker.Feature.MINE_ONLY)
          .setOAuthToken(accessToken)
          .setDeveloperKey(DEV_KEY)
          .setCallback(Vapp.drive.pickerCallback)
          .build();

    picker.setVisible(true);
  },
  pickerCallback: function(data){
    var _ui = Vapp.ui,
        _o = Vapp.options;

    _ui.trace('pickerCallback'); /*debug_remove*/
    if(data.action == google.picker.Action.PICKED){
      _ui.reporter('Picker response', data); /*debug_remove*/
      _o.dr_id = data.docs[0].id;
      _o.dr_title = data.docs[0].name;
      if(Vapp.helper === 'load'){
        Vapp.getData();
      } else if(Vapp.helper === 'save'){
        Vapp.saveData();
      }
    }
  },
  downloadFile: function(file) {
    var _ui = Vapp.ui;

    _ui.trace('downloadFile'); /*debug_remove*/
    if (file.downloadUrl) {
      var accessToken = gapi.auth.getToken().access_token;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', file.downloadUrl);
      xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
      xhr.onload = function() {
        _ui.lockScreen(false);
        var data = xhr.responseText;
        _ui.reporter('Data downloaded:'); /*debug_remove*/
        try{
          Vapp.data = JSON.parse(data);
          _ui.reporter('Received data:', 1); /*debug_remove*/
        }catch(e){
          Vapp.data = data;
          _ui.reporter('Received data is not a valid JSON.', data); /*debug_remove*/
        }
        // data received and sent to Callback
        Vapp.callback.dataLoaded(Vapp.data);
        Vapp.reset();
      };
      xhr.onerror = function() {
        _ui.lockScreen(false);
        _ui.reporter('XHR error!'); /*debug_remove*/
        Vapp.reset();
      };
      xhr.send();
    } else {
      Vapp.reset();
      _ui.reporter('Can\'t download...'); /*debug_remove*/
    }
  },
  getDataFromDrive: function(){
    var _ui = Vapp.ui;

    _ui.trace('getDataFromDrive'); /*debug_remove*/
    _ui.hidePopup();
    var fileId  = Vapp.options.dr_id;
    if(!fileId){
      Vapp.drive.createPicker();
      return false;
    }
    _ui.lockScreen(true, 'Loading data from Drive');
    _ui.reporter('We are loading data...'); /*debug_remove*/
    var request = gapi.client.drive.files.get({
      'fileId': fileId
    });
    request.execute(function(resp) {
      Vapp.drive.downloadFile(resp);
    });
  },
  addNewFile: function(){
    Vapp.ui.trace('addNewFile'); /*debug_remove*/
    var val = $.trim( $('#drivesave-fname').val() );
    if(val){
      Vapp.drive.checkFileExists(val, Vapp.drive.addNewFileHandle);
    }
  },
  addNewFileHandle: function(fl){
    var _ui = Vapp.ui,
        _o = Vapp.options;

    _ui.trace('addNewFileHandle',fl); /*debug_remove*/
    if(fl && fl.id && fl.title){
      _o.dr_id = fl.id;
      _o.dr_title = fl.title;
      _ui.showPopup('exists');
      if(fl.labels.trashed){
        _o.trash = true;
        _ui.existsMsg('It is in Trash folder! Will be restored if continue.');
      } else {
        _o.trash = false;
        _ui.existsMsg('');
      }
    } else {
      _ui.hidePopup();
      _o.dr_title = $.trim( $('#drivesave-fname').val() );
      Vapp.saveData();
    }
    $('#drivesave-fname').val('');
  },
  addNewExistsBack: function(){
    Vapp.ui.trace('addNewExistsBack'); /*debug_remove*/
    Vapp.ui.showPopup('new');
    Vapp.options = {}; // reset filename
  },

};

Vapp.callback = {
  authOK: function(){ console.log('Callback: authOK'); },
  driveOK: function(){ console.log('Callback: driveOK'); },
  dataSaved: function(){ console.log('Callback: dataSaved'); },
  dataLoaded: function(data){ console.log('Callback: dataLoaded ->'); console.log(data); },
};
