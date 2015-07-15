/*
- use DriveStorage.save(somedata) to save `somedata` var to Google Drive
- use DriveStorage.get() to receive data from Google Drive. You'll receive it in DriveStorage.callback.loaded() callback as the first argument
- on saving you can enter a file name or select one with a picker
- creates Google Drive file with selected name is it doesn't exist, update it if exist (warning if user types name of existing file)
- if file with selected name is in Trash, file will be restored/untrashed

Used google tutorial examples:
https://developers.google.com/drive/web/quickstart/quickstart-js
https://developers.google.com/drive/v2/reference/files/get
https://developers.google.com/drive/v2/reference/files/update

 */
// lines with /*debug_remove*/ should be removed

var DriveStorage = (function(){
  var Module = {};
  var app_clientId, app_devKey, app_scopes;

  var ds_pre = 'drivesave-',
      ds_prefix = '.'+ds_pre,
      ds_overlay = ds_prefix+'overlay', // .drivesave-overlay
      ds_overlay0 = ds_pre+'overlay', // drivesave-overlay
      ds_popup = ds_prefix+'popup', // .drivesave-popup
      ds_popup0 = ds_pre+'popup', // drivesave-popup
      ds_fname = '#'+ds_pre+'fname'; // #drivesave-fname

  var DS = {
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
      // used dinamycally on set/get. no real need in init()
      DS.ui.add();
      DS.auth.loadGapi();
    },
    reset: function(){
      DS.options = {};
      DS.data = null;
      DS.doLater = null;
      DS.ui.hidePopup();
      DS.ui.lockScreen(false);
    },
    isReady: function(){
      DS.ui.add();
      if(typeof gapi === 'undefined' && !DS.gapiLoading){
        DS.auth.loadGapi();
        return false;
      } else if(!gapi.client.drive){
        DS.auth.checkAuth();
        return false;
      }
      return true;
    },
    getData: function(){
      DS.ui.trace('getData'); /*debug_remove*/
      if(!DS.isReady()){
        DS.doLater = function(){ DS.getData(); };
        return;
      }
      DS.helper = 'load';
      DS.drive.getDataFromDrive();
    },
    saveData: function(data) {
      var _ui = DS.ui,
          _d = DS.drive;
      if(data){
        DS.data = data;
      }
      if(!DS.isReady()){
        DS.doLater = function(){ DS.saveData(); };
        return;
      }
      DS.helper = 'save';

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

  DS.auth = {
    loadGapi: function(callback){
      callback = callback || 'DriveStorage_clientLoaded';
      DS.ui.trace('loadGapi'); /*debug_remove*/
      DS.gapiLoading = true;
      DS.ui.lockScreen(true, 'Loading Google API');
      var script = document.createElement('script');
      script.src = 'https://apis.google.com/js/client.js?onload='+callback;
      document.getElementsByTagName('head')[0].appendChild(script);
    },
    handleClientLoad: function() {
      DS.ui.trace('handleClientLoad'); /*debug_remove*/
      window.setTimeout(DS.auth.checkAuth, 1);
    },
    checkAuth: function() {
      DS.ui.lockScreen(true, 'Authorization with Google');
      DS.ui.trace('checkAuth'); /*debug_remove*/
      gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true}, DS.auth.handleAuthResult);
    },
    checkAuth2: function(){
      if(!gapi.auth.getToken()){
        gapi.auth.authorize({'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false}, DS.auth.handleAuthResult);
      }
    },
    handleAuthResult: function(authResult) {
      var _ui = DS.ui,
          _o = DS.options;

      _ui.trace('handleAuthResult'); /*debug_remove*/
      _ui.lockScreen(false);
      if(authResult && !authResult.error) {
        Module.callback.auth();
        _ui.lockScreen(true, 'Loading Google Drive API');
        gapi.client.load('drive', 'v2', function(){
          gapi.load('picker', function(){
            _ui.lockScreen(false);
            Module.callback.drive();
            if(typeof DS.doLater === 'function'){ DS.doLater(); DS.doLater = null; }
          });
        });
      } else {
        DS.auth.checkAuth2();
      }
    }
  };

  DS.ui = {
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
    /*debug_remove*/        console.log(DS.data);
    /*debug_remove*/      }
    /*debug_remove*/    }
    /*debug_remove*/  },
    add: function(){
      if($(ds_overlay).length){ return; }
      var code = '<div class="'+ds_overlay0+'"><!----></div>'
        +'<div class="'+ds_popup0+'" id="'+ds_pre+'new">'
          +'<i class="ico-close">close</i>'
          +'<br>'
          +'Create file on Drive: <input type="text" id="'+ds_pre+'fname" value=""> <input type="button" class="'+ds_pre+'btn-new" value="Create">'
          +'<br><br>'
          +'Or: <input type="button" class="'+ds_pre+'btn-picker" value="Select file on Drive to rewrite">'
        +'</div>'
        +'<div class="'+ds_popup0+' tcenter" id="'+ds_pre+'exists">'
          +'File with this name already exists. Do you want to use it anyway?<br>'
          +'<span class="msg"></span><br><br>'
          +'<input type="button" class="'+ds_pre+'btn-save" value="Sure"> <input type="button" class="'+ds_pre+'btn-new-abort" value="Back">'
        +'</div>'
        +'<div class="'+ds_popup0+' tcenter" id="'+ds_pre+'error">'
          +'<i class="ico-close">close</i>'
          +'<br><span class="msg"></span><br><br>'
        +'</div>';
      $('body').append(code);
      $('body').on('click', ds_popup+' .ico-close', DS.reset)
               .on('click', ds_prefix+'btn-new', DS.drive.addNewFile)
               .on('click', ds_prefix+'btn-new-abort', DS.drive.addNewExistsBack)
               .on('click', ds_prefix+'btn-save', function(){ DS.saveData(); })
               .on('click', ds_prefix+'btn-picker', DS.drive.createPicker);
    },
    lockScreen: function(trig, msg){
      DS.ui.trace('lockScreen', trig); /*debug_remove*/
      if(trig){
        $('body').addClass(ds_pre+'locked');
        if(msg){
          $('body').attr('lockmsg', msg);
        }
      } else {
        $('body').removeClass(ds_pre+'locked').removeAttr('lockmsg');
      }
    },
    hidePopup: function(){
      DS.ui.trace('hidePopup'); /*debug_remove*/
      $(ds_overlay+', '+ds_popup).hide();
    },
    showPopup: function(name, txt){
      DS.ui.trace('showPopup',name); /*debug_remove*/
      var $pop = name ? $('#'+ds_pre+name) : null;
      if($pop && $pop.length){
        $(ds_overlay).show();
        $(ds_popup).hide();
        $('#'+ds_pre+name).show();
        txt = txt || '';
        if(name === 'new'){
          $(ds_fname).focus();
          //DS.auth.checkAuth2();
        } else if(name === 'error'){
          txt = txt || 'Sorry, something bad happend.. Please try later.';
        }
        $('#'+ds_pre+name).find('.msg').html(txt);
      }
    }

  };

  DS.drive = {
    metadata: {},
    getFileMetadata: function() {
      DS.ui.trace('getFileMetadata'); /*debug_remove*/
      if(DS.options.dr_title){
        this.metadata = {
          'title': DS.options.dr_title,
          'mimeType': 'application/json'
        }
      } else {
        this.metadata = null;
      }
    },
    saveDataHandle: function(fl) {
      DS.ui.trace('saveDataHandle',fl); /*debug_remove*/
      if(fl && fl.id){
        DS.ui.reporter('File already exists...'); /*debug_remove*/
        DS.drive.saveToFile(fl.id);
      } else {
        DS.ui.reporter('Will create a new file...'); /*debug_remove*/
        DS.drive.saveToFile();
      }
    },
    saveToFile: function(fileId) {
      var _ui = DS.ui,
          _meta = DS.drive.metadata,
          _o = DS.options;

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
      var savingData = typeof DS.data === 'string' ? DS.data : JSON.stringify(DS.data);
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
          DS.drive.restoreFromTrash(fileId);
        }
        DS.reset();
        Module.callback.saved();
      });
    },
    restoreFromTrash: function(id){
      var _ui = DS.ui;
      var request = gapi.client.drive.files.untrash({
        'fileId': id
      });
      _ui.trace('restoreFromTrash',id); /*debug_remove*/
      request.execute(function(resp) {
        _ui.trace('restored from Trash!'); /*debug_remove*/
      });
    },
    checkFileExists: function(fname, callback){
      DS.ui.trace('checkFileExists', fname); /*debug_remove*/
      DS.ui.reporter('Looking for: ' + fname); /*debug_remove*/

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
      DS.ui.trace('createPicker'); /*debug_remove*/
      if(!gapi.auth.getToken()){
        DS.auth.checkAuth2();
        return;
      }
      if(typeof google === 'undefined'){
        DS.auth.checkAuth();
        return;
      }
      var accessToken = gapi.auth.getToken().access_token;
      var picker = new google.picker.PickerBuilder()
            .addView(new google.picker.DocsView().setIncludeFolders(true).setMode(google.picker.DocsViewMode.LIST))
            //.addView(new google.picker.DocsUploadView())
            .enableFeature(google.picker.Feature.MINE_ONLY)
            .setOAuthToken(accessToken)
            .setDeveloperKey(DEV_KEY)
            .setCallback(DS.drive.pickerCallback)
            .build();

      picker.setVisible(true);
    },
    pickerCallback: function(data){
      var _ui = DS.ui,
          _o = DS.options;

      _ui.trace('pickerCallback'); /*debug_remove*/
      if(data.action == google.picker.Action.PICKED){
        _ui.reporter('Picker response', data); /*debug_remove*/
        _o.dr_id = data.docs[0].id;
        _o.dr_title = data.docs[0].name;
        if(DS.helper === 'load'){
          DS.getData();
        } else if(DS.helper === 'save'){
          DS.saveData();
        }
      }
    },
    downloadFile: function(file) {
      var _ui = DS.ui;

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
            DS.data = JSON.parse(data);
            _ui.reporter('Received data:', 1); /*debug_remove*/
          }catch(e){
            DS.data = data;
            _ui.reporter('Received data is not a valid JSON.', data); /*debug_remove*/
          }
          // data received and sent to Callback
          Module.callback.loaded(DS.data);
          DS.reset();
        };
        xhr.onerror = function() {
          _ui.lockScreen(false);
          _ui.reporter('XHR error!'); /*debug_remove*/
          DS.reset();
        };
        xhr.send();
      } else {
        DS.reset();
        _ui.reporter('Can\'t download...'); /*debug_remove*/
      }
    },
    getDataFromDrive: function(){
      var _ui = DS.ui;

      _ui.trace('getDataFromDrive'); /*debug_remove*/
      _ui.hidePopup();
      var fileId  = DS.options.dr_id;
      if(!fileId){
        DS.drive.createPicker();
        return false;
      }
      _ui.lockScreen(true, 'Loading data from Drive');
      _ui.reporter('We are loading data...'); /*debug_remove*/
      var request = gapi.client.drive.files.get({
        'fileId': fileId
      });
      request.execute(function(resp) {
        DS.drive.downloadFile(resp);
      });
    },
    addNewFile: function(){
      DS.ui.trace('addNewFile'); /*debug_remove*/
      var val = $.trim( $(ds_fname).val() );
      if(val){
        DS.drive.checkFileExists(val, DS.drive.addNewFileHandle);
      }
    },
    addNewFileHandle: function(fl){
      var _ui = DS.ui,
          _o = DS.options;

      _ui.trace('addNewFileHandle',fl); /*debug_remove*/
      if(fl && fl.id && fl.title){
        _o.dr_id = fl.id;
        _o.dr_title = fl.title;
        var msg = '';
        if(fl.labels.trashed){
          _o.trash = true;
          msg = 'It is in Trash folder! Will be restored if continue.';
        } else {
          _o.trash = false;
        }
        _ui.showPopup('exists', msg);
      } else {
        _ui.hidePopup();
        _o.dr_title = $.trim( $(ds_fname).val() );
        DS.saveData();
      }
      $(ds_fname).val('');
    },
    addNewExistsBack: function(){
      DS.ui.trace('addNewExistsBack'); /*debug_remove*/
      DS.ui.showPopup('new');
      DS.options = {}; // reset filename
    },

  };


  Module.init = function(client, devkey, scopes){
    app_clientId = client;
    app_devKey = devkey;
    app_scopes = scopes;
  };
  Module.get = function(){
    DS.getData();
  };
  Module.save = function(data){
    DS.saveData(data);
  };
  Module.authGapi = function(callback){
    DS.auth.loadGapi(callback);
  };
  Module.authHandle = function(){
    DS.auth.handleClientLoad()
  };
  Module.get = function(){
    DS.getData();
  };
  Module.ui = {
    lockScreen: function(trig, msg){
      DS.ui.lockScreen(trig, msg);
    },
    showPopup: function(name, txt){
      DS.ui.showPopup(name, txt);
    },
    hidePopup: function(){
      DS.ui.hidePopup();
    },
  };
  Module.callback = {
    auth: function(){
      console.log('Callback: authOK'); /*debug_remove*/
    },
    drive: function(){
      console.log('Callback: driveOK'); /*debug_remove*/
    },
    saved: function(){
      console.log('Callback: dataSaved'); /*debug_remove*/
    },
    loaded: function(data){
      console.log('Callback: dataLoaded ->'); /*debug_remove*/
      console.log(data); /*debug_remove*/
    },
  };

  return Module;

})();

// callback in url doesn't work with dots
var DriveStorage_clientLoaded = function() {
  DriveStorage.authHandle();
};


