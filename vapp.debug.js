/*
 - saving Vapp.data to Drive or localy
 - if Google Drive file not defined - saves to localStorage[Vapp.dataKey]
 - selected Google Drive file id/title saved to localStorage[Vapp.stateKey] (Vapp.options)
 - create Google Drive file with selected name is it doesn't exist, update it if exist (warning if user types name of existing file)
 - saved data is awailable in localStorage after disabling saving to Google Drive

Used google tutorial examples:
https://developers.google.com/drive/web/quickstart/quickstart-js
https://developers.google.com/drive/v2/reference/files/get
https://developers.google.com/drive/v2/reference/files/update

 */
// lines with /*debug_remove*/ should be removed

var Vapp = {
  gapi: false,
  stateKey: 'vapp_state',
  dataKey: 'vapp_data',
  options: {
    /*
    useDrive: true,
    dr_id: "0B-UCMEm2hwO7bzNTRmNXdGdaRm8",
    dr_title: "sample.json"
    */
  },
  data: {},
  init: function() {
    Vapp.getStogareData();
    Vapp.ui.formInit();
    if(Vapp.options.useDrive){
      Vapp.auth.loadGapi('vapp_clientLoad');
    } else {
      Vapp.getData(); // else Data will be autoloaded after gapi ready
    }
  },
  resetDrive: function(){
    delete this.options.dr_id;
    delete this.options.dr_title;
  },
  getData: function(){
    Vapp.ui.trace('getData'); /*debug_remove*/
    if(Vapp.options.useDrive){
      Vapp.drive.getDataFromDrive();
    } else {
      var data = localStorage.getItem(Vapp.dataKey);
      if(data){
        try{
          Vapp.data = JSON.parse(data);
          Vapp.handleData();
          Vapp.ui.reporter('Data loaded from localStorage', 1); /*debug_remove*/
        }catch(e){
          Vapp.ui.reporter('Sorry, but your JSON is incorrect.', data); /*debug_remove*/
          Vapp.handleData();
        }
      } else {
        Vapp.ui.reporter('You have no data yet.'); /*debug_remove*/
        Vapp.handleData();
      }
    }
  },
  saveData: function() {
    var _ui = Vapp.ui,
        _d = Vapp.drive;

    _ui.trace('saveData'); /*debug_remove*/
    _ui.hidePopup();
    if(Vapp.options.useDrive){
      _ui.lockScreen(true, 'Saving app data');
      _d.getFileMetadata();
      if(!_d.metadata){
        _ui.chooseResourceFile(); // ask to select file for saving
        _ui.reporter('Saving canceled. File name is required.'); /*debug_remove*/
        _ui.lockScreen(false);
        return false;
      }
      _d.checkFileExists(_d.metadata.title, _d.saveDataHandle);
    } else {
      _ui.reporter('Data saved to localStorage.', 1); /*debug_remove*/
      Vapp.callback.dataSaved();
    }
    localStorage.setItem(Vapp.dataKey, JSON.stringify(Vapp.data));
  },
  handleData: function(){
    Vapp.ui.trace('handleData'); /*debug_remove*/
    var str = JSON.stringify(Vapp.data);
    if(!Vapp.data || str === '{}' || str === '[]'){
      $('#data').html( 'No data yet...' );
    } else {
      $('#data').html( str );
    }
  },
  getStogareData: function(){
    Vapp.ui.trace('getStogareData'); /*debug_remove*/
    var state = localStorage.getItem(Vapp.stateKey);
    Vapp.options = state ? JSON.parse(state) : {};
    Vapp.ui.updateFileName();
  },
  setStogareData: function(){
    Vapp.ui.trace('setStogareData'); /*debug_remove*/
    localStorage.setItem(Vapp.stateKey, JSON.stringify(Vapp.options));
    Vapp.ui.updateFileName();
  }
};

Vapp.auth = {
  loadGapi: function(callback){
    callback = callback || 'vapp_clientLoad';
    Vapp.ui.trace('loadGapi'); /*debug_remove*/
    Vapp.gapi = true;
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
    if (authResult && !authResult.error) {
      Vapp.callback.authOK();
      _ui.lockScreen(true, 'Loading Google Drive API');
      gapi.client.load('drive', 'v2', function(){
        gapi.load('picker');
        _ui.lockScreen(false);
        if(_o.useDrive){
          _ui.updateFileName();
          if(_o.dr_id){
            Vapp.getData();
          } else {
            _ui.chooseResourceFile();
          }
        }
      });
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
  lockScreen: function(trig, msg){
    Vapp.ui.trace('lockScreen', trig); /*debug_remove*/
    if(trig){
      $('body').addClass('locked');
      if(msg){
        $('body').attr('lockmsg', msg);
      }
    } else {
      $('body').removeClass('locked').removeAttr('lockmsg');
    }
  },
  hidePopup: function(){
    Vapp.ui.trace('hidePopup'); /*debug_remove*/
    $('#popup-overlay,.popup').hide();
  },
  showPopup: function(name){
    Vapp.ui.trace('showPopup',name); /*debug_remove*/
    var $pop = name ? $('#'+name) : null;
    if($pop && $pop.length){
      $('#popup-overlay').show();
      $('.popup').hide();
      $('#'+name).show();
      if(name === 'pop-new'){
        Vapp.callback.requireFileName();
        Vapp.auth.checkAuth2();
      }
    }
  },
  updateFileNotCreated: function(trig){
    if(trig){
      $('.file-is-not-created').show();
    } else {
      $('.file-is-not-created').hide();
    }
  },
  updateFileName: function(){
    Vapp.ui.trace('updateFileName'); /*debug_remove*/
    if(Vapp.options.dr_title){
      $('.current-file-name').text( Vapp.options.dr_title ).show();
      $('#wrapDrive').show();
    } else {
      $('.current-file-name').hide();
      $('#wrapDrive').hide();
    }
  },
  chooseResourceFile: function(){
    Vapp.ui.trace('chooseResourceFile'); /*debug_remove*/
    Vapp.ui.showPopup('pop-new');
  },
  formInit: function(){
    if($('#setUseDrive')[0]){
      $('#setUseDrive')[0].checked = Vapp.options.useDrive ? true : false;
      $('#settings').on('change', Vapp.ui.formHandle);
    }
  },
  formHandle: function(){
    Vapp.options.useDrive = $('#setUseDrive')[0].checked;
    Vapp.ui.triggerHandler();
  },
  triggerHandler: function(){
    var _ui = Vapp.ui,
        _o = Vapp.options;

    if(_o.useDrive){
      if(typeof gapi === 'undefined' && !Vapp.gapi){
        Vapp.auth.loadGapi('vapp_clientLoad');
      } else if(!gapi.client.drive){
        Vapp.auth.checkAuth();
      }
      _ui.chooseResourceFile();
      // popup opens, but block while gapi is ready
    } else {
      Vapp.resetDrive();
      _ui.updateFileNotCreated(0);
    }

    _ui.updateFileName();
    Vapp.setStogareData();
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
    var _ui = Vapp.ui
        _meta = Vapp.drive.metadata,
        _o = Vapp.options;

    _ui.trace('saveToFile',fileId); /*debug_remove*/
    _ui.updateFileNotCreated(0);

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
    var safeString = unescape(encodeURIComponent(JSON.stringify(Vapp.data)))
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
      _ui.lockScreen(false);
      _ui.reporter(_debugMsg, res); /*debug_remove*/
      _o.dr_id = res.id;
      _o.dr_title = res.title;
      Vapp.setStogareData();
      Vapp.callback.dataSaved();
    });
  },
  createPicker: function(){
    Vapp.ui.trace('createPicker'); /*debug_remove*/
    if(typeof gapi === 'undefined' && !Vapp.gapi){
      Vapp.auth.loadGapi('vapp_clientLoad');
      return;
    }
    if(!gapi.auth.getToken()){
      Vapp.auth.checkAuth2();
      return;
    }
    if(typeof google === 'undefined'){
      Vapp.auth.checkAuth();
      return;
    }
    var accessToken = gapi.auth.getToken().access_token;
    if(!Vapp.options.noUpload){
      var picker = new google.picker.PickerBuilder()
            .addView(new google.picker.DocsView())
            .addView(new google.picker.DocsUploadView())
            .enableFeature(google.picker.Feature.MINE_ONLY)
            .setOAuthToken(accessToken)
            .setDeveloperKey(DEV_KEY)
            .setCallback(Vapp.drive.pickerCallback)
            .build();
    } else {
      var picker = new google.picker.PickerBuilder()
            .addView(new google.picker.DocsView())
            .enableFeature(google.picker.Feature.MINE_ONLY)
            .setOAuthToken(accessToken)
            .setDeveloperKey(DEV_KEY)
            .setCallback(Vapp.drive.pickerCallback)
            .build();
    }
    picker.setVisible(true);
  },
  pickerCallback: function(data){
    var _ui = Vapp.ui,
        _o = Vapp.options;

    _ui.trace('pickerCallback'); /*debug_remove*/
    if(data.action == google.picker.Action.PICKED){
        _ui.reporter('Picker response', data); /*debug_remove*/
        _ui.showPopup('pop-picked');
        _ui.updateFileNotCreated(0);
        _o.dr_id = data.docs[0].id;
        _o.dr_title = data.docs[0].name;
        Vapp.setStogareData();
        Vapp.callback.filePicked();
    }
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
          Vapp.handleData();
          localStorage.setItem(Vapp.dataKey, JSON.stringify(Vapp.data));
          _ui.reporter('Updated data:', 1); /*debug_remove*/
        }catch(e){
          _ui.reporter('Sorry, but your JSON is incorrect.', data); /*debug_remove*/
        }
      };
      xhr.onerror = function() {
        _ui.lockScreen(false);
        _ui.reporter('XHR error!'); /*debug_remove*/
      };
      xhr.send();
    } else {
      _ui.lockScreen(false);
      Vapp.resetDrive();
      Vapp.setStogareData();
      _ui.reporter('Can\'t download...'); /*debug_remove*/
      Vapp.drive.abortDrive();
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
    var val = $.trim( $('#fname').val() );
    if(val){
      Vapp.drive.checkFileExists(val, Vapp.drive.addNewFileHandle);
    }
  },
  addNewExistsBack: function(){
    Vapp.ui.trace('addNewExistsBack'); /*debug_remove*/
    Vapp.ui.showPopup('pop-new');
    Vapp.resetDrive();
    Vapp.setStogareData();
  },
  abortDrive: function(){
    Vapp.ui.trace('abortDrive'); /*debug_remove*/
    if(!Vapp.options.dr_title){
      Vapp.options.useDrive = false;
      if(document.settings && document.settings.setUseDrive){
        document.settings.setUseDrive.checked = false;
        Vapp.ui.formHandle();
      } else {
        Vapp.ui.triggerHandler();
      }
      Vapp.getData();
    }
    Vapp.ui.hidePopup();
  },
  addNewFileHandle: function(fl){
    var _ui = Vapp.ui,
        _o = Vapp.options;

    _ui.trace('addNewFileHandle',fl); /*debug_remove*/
    if(fl && fl.id && fl.title){
      _o.dr_id = fl.id;
      _o.dr_title = fl.title;
      Vapp.setStogareData();
      _ui.showPopup('pop-exists');
    } else {
      _ui.hidePopup();
      _o.dr_title = $.trim( $('#fname').val() );
      _ui.updateFileName();
      _ui.reporter('Will create a new file on next Save'); /*debug_remove*/
      _ui.updateFileNotCreated(1);
      Vapp.callback.newFileNameReady();
    }
    $('#fname').val('');
  }
};

Vapp.callback = {
  requireFileName: function(){ console.log('Callback: requireFileName'); },
  authOK: function(){ console.log('Callback: authOK'); },
  dataSaved: function(){ console.log('Callback: dataSaved'); },
  newFileNameReady: function(){ console.log('Callback: newFileNameReady'); },
  filePicked: function(){ console.log('Callback: filePicked'); },
};
