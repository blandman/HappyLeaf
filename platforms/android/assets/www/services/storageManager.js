happyLeaf.factory('storageManager', ['$rootScope', 'dataManager', 'connectionManager', 'logManager', '$localStorage', function($rootScope, dataManager, connectionManager, logManager, $localStorage){
  if(!$localStorage.settings || !$localStorage.settings.data){
    $localStorage.mileDriven = 0;
    $localStorage.settings = {
      data: {
        graphTimeEnd: 86400000,
        showLatestGraph: false,
      }
    };
  }
  if($localStorage.settings.experiance == null) $localStorage.settings.experiance = {};
  //if($localStorage.settings.experiance.distanceUnits == null) $localStorage.settings.experiance.distanceUnits = null; //Use null value to auto set on first launch
  //if($localStorage.settings.experiance.tempUnits == null) $localStorage.settings.experiance.tempUnits = null;
  if($localStorage.settings.experiance.displayAllData == null) $localStorage.settings.experiance.displayAllData = true;
  if($localStorage.settings.experiance.displayLogs == null) $localStorage.settings.experiance.displayLogs = true;
  if($localStorage.settings.experiance.darkModeAmbient == null) $localStorage.settings.experiance.darkModeAmbient = true;
  if($localStorage.settings.experiance.lightSensitivity == null) $localStorage.settings.experiance.lightSensitivity = 6;
  if($localStorage.settings.experiance.darkModeHeadlights == null) $localStorage.settings.experiance.darkModeHeadlights = false;

  if($localStorage.settings.notifications == null) $localStorage.settings.notifications = {};
  if($localStorage.settings.notifications.enablePush == null) $localStorage.settings.notifications.enablePush = true;
  if($localStorage.settings.notifications.tireHighThreshold == null) $localStorage.settings.notifications.tireHighThreshold = 42;
  if($localStorage.settings.notifications.tireLowThreshold == null) $localStorage.settings.notifications.tireLowThreshold = 32;
  if($localStorage.settings.notifications.tireDeltaThreshold == null) $localStorage.settings.notifications.tireDeltaThreshold = 2;

  if($localStorage.settings.experimental == null) $localStorage.settings.experimental = {};
  if($localStorage.settings.experimental.darkModeAmbient == null) $localStorage.settings.experimental.debugCodes = false;
  if($localStorage.settings.experimental.logOBDFile == null) $localStorage.settings.experimental.logOBDFile = false;
  if($localStorage.settings.experimental.logHistoryFile == null) $localStorage.settings.experimental.logHistoryFile = false;

  if($localStorage.settings.data.drivingDataAttributes == null) $localStorage.settings.data.drivingDataAttributes = [];

  if($localStorage.settings.wifi == null) $localStorage.settings.wifi = {};
  if($localStorage.settings.wifi.ipaddress == null) $localStorage.settings.wifi.ipaddress = "192.168.0.10";
  if($localStorage.settings.wifi.port == null) $localStorage.settings.wifi.port = 35000;
  if($localStorage.settings.wifi.allow == null) $localStorage.settings.wifi.allow = true;

  $localStorage.settings.about = {
    version: "0.1.9.7"
  };

  var lastHistoryItem = {lastUpdateTime: (new Date()).getTime()};
  var self = {
    db: null,

    createHistoryPoint: function(){
      if(connectionManager.isConnected && !cordova.plugins.backgroundMode.isActive() && dataManager.lastUpdateTime > lastHistoryItem.lastUpdateTime){
        var now = (new Date()).getTime();
        dataManager.endTime = now;
        var currentDataManager = {};
        async.forEach(Object.keys(dataManager), function(key){
          if(typeof dataManager[key] !== 'function'){
            currentDataManager[key] = dataManager[key];
          }
        });

        $localStorage.history[now] = currentDataManager;
        $localStorage.historyCount = Object.keys($localStorage.history).length;
        dataManager.historyCreated();
        lastHistoryItem = currentDataManager;
        $rootScope.$broadcast('historyUpdated');
        logManager.log("Created history, now have " + $localStorage.historyCount);
        if(!$localStorage.currentTripStart || $localStorage.currentTripStart == null) {
          $localStorage.currentTripStart = currentDataManager;
        }
      }
      //console.log("Creating history point");
    },

    startupDB: function(){
      console.log("WOW Wtf..");
      /*
      //failed attempt at web SQL..
      $rootScope.$on('dataUpdate', function(event, data){
        console.log("Going to save this data " + data.keys().join());
        //check here if an interval should be saved.
      });

      self.db = window.sqlitePlugin.openDatabase({name: 'happyLeaf.db', location: 'default'});

      self.db.transaction(function(tx) {
       tx.executeSql('CREATE TABLE IF NOT EXISTS Trips (time_start, time_end, id, start_KW, end_KW, start_odo, end_obo)');
       console.log("Try to loop over keys avaliable in dataManager");
       console.log(dataManager.keys().join());
       tx.executeSql('CREATE TABLE IF NOT EXISTS TripIntervals (time_start, time_end, id)');
       //tx.executeSql('INSERT INTO DemoTable VALUES (?,?)', ['Alice', 101]);
       //tx.executeSql('INSERT INTO DemoTable VALUES (?,?)', ['Betty', 202]);
     }, function(error) {
       console.log('Transaction ERROR: ' + error.message);
     }, function() {
       console.log('Populated database OK');
     });*/

   }
  };

  logManager.log("Cleaning up history");
  if($localStorage.history) {
    var ONE_DAY = 172800000;
    var now = (new Date()).getTime();
    $localStorage.milesDrivenToday = 0;
    var lastDrivenToday = 0;
    var index = 0;
    var timesToProcess = Object.keys($localStorage.history).reverse(); //Loop from newest to oldest
    async.forEach(timesToProcess, function(key){
      var historyDataPoint = $localStorage.history[key];

      //Check if is same day.
      if(moment().isSame(moment(historyDataPoint.startTime), 'day') && historyDataPoint.odometer < lastDrivenToday && historyDataPoint.odometer < 800000) {
        if(lastDrivenToday == 0) {
          //$localStorage.milesDrivenToday += 1;
        } else if(historyDataPoint.odometer < lastDrivenToday ) {
          $localStorage.milesDrivenToday += historyDataPoint.odometer - lastDrivenToday;
        } else if(historyDataPoint.odometer > lastDrivenToday + 100) {
          historyDataPoint.odometer = lastDrivenToday;
        } else {
          $localStorage.milesDrivenToday -= lastDrivenToday - historyDataPoint.odometer;
        }
        lastDrivenToday = historyDataPoint.odometer;
      }

      //Goodbye
      //if(parseInt(now) - ONE_DAY > parseInt(key)) { //Used to delete based on time
      if(index > 2000) { //Now delete if this is too much to store
        delete $localStorage.history[key];
      } else {
        $localStorage.history[key] = historyDataPoint; //Place history back with corrections.
      }
      index ++;
    });
  } else {
    $localStorage.history = {};
  }

  return self;
}]);
