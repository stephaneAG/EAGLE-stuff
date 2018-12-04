/*
  Generate a package.json from the items found in the currently opened Illustrator document
*/


// ==== INCLUDES ====
#include "json2.js" // jshint ignore:line

// ==== LOG HELPER ====
var logToFile = true; // to log to a file as well as in the  javascript console
var docPath = app.activeDocument.path;
//var logFile = new File("./testIllustratorLogFile.txt"); // save it at the root of the HD
var logFile = new File(docPath + '/' + 'generatePackage' +'.log');
logFile.lineFeed = "Macintosh"; // nay better output for human readers ?
if( logToFile === true ) logFile.open('w'); // R to if( logToFile === true ) logFile.close();
var console = { log: function(message){ $.writeln(message); if( logToFile === true ) logFile.writeln(message); } };
$.writeln('lol'); // log to console only
console.log('[ formatDoc_plugin.jsx - logs ]'); // look to both console & logfile
console.log(''); // a littl space


// ==== UNITS HELPERS ====
function rndMm(num){ return ( num * 0.3528 ).toFixed(2); } // quick helper

// ==== EAGLE ILLUSTRATOR HELPER ====
var eagleCenter = undefined;
var eagleCenterPos = {};

//alert('test ..');
//var docPathsItems = app.activeDocument.pathItems;
//alert("Numberof pathItems in document:" + docPathsItems.length );
//alert(docPathsItems.getByName('EAGLE_CENTER') );
//alert(app.activeDocument.pathItems.getByName('EAGLE_CENTER').typename);
//exit(0);

// make sure we have a crosshair ( or any obj ) to help relative parts positionning :)
//if( app.activeDocument.pathItems.getByName('EAGLE_CENTER') != undefined){
  eagleCenter = app.activeDocument.pathItems.getByName('EAGLE_CENTER');
  var eC = eagleCenter.position;
  eC[0] += eagleCenter.width/2.0;
  eC[1] -= eagleCenter.height/2.0;
  eagleCenterPos['cxr'] = rndMm(eC[0]);
  eagleCenterPos['cyr'] = rndMm(eC[1]);
  eagleCenterPos['cx'] = eC[0];
  eagleCenterPos['cy'] = eC[1];
  console.log("\nEAGLE_CENTER found > proceeding ..");
//} else {
//  console.log("\nEAGLE_CENTER NOT found ! Please add one to be used as relative position reference ..");
  //exit(-1); // unsure about this .. R: we NEED an item called 'EAGLE_CENTER' to compute the relative positionning ( relying on artboard center 'd be unpractical/silly .. )
//}


// ==== VARS ====
var supportedLayers = ["UL_HOLES","UL_PADS","UL_SMDS", "UL_WIRES", "UL_POLYGONS"];
var supportedLayersStr = supportedLayers.join(',');
var protograph = {};
for(var i=0; i < supportedLayers.length; i++){
  var singular = supportedLayers[i].substring(0, supportedLayers[i].length -1);
  protograph[singular] = []; // add array "UL_HOLE", ..
}
//alert('protograph:' + protograph);
//alert('protograph in json:\n' + JSON.stringify(protograph) );


// ==== GROUP || PATHITEM HELPER ====
function recursivelyParse(eitherObj, singular){
  var actObj = eitherObj;
  //if(actObj.hasOwnProperty("name") ) alert("recursivelyParse > Object type: " + actObj.typename + " & name: " + actObj.name); //obj["name"] = actObj.name; // debug - won't be parsed Eagle-side ..
  //else alert("recursivelyParse > Object type: " + actObj.typename + " not named");
  //else obj["name"] = 'NONAME';
  //alert("recursivelyParse > Object type: " + actObj.typename + " & name: " + obj["name"]);

  if(actObj.typename == "PathItem"){ // if pathItem, process
    var obj = {}; // we're not getting any attributes from anything for now ( not useful anyway of polygons & wires used to draw stuff, may be for grouped pads r smds .. )
    obj["name"] = actObj.name || 'NONAME'; // TODO: fix polygon pathPoints & remove this debug :)
    obj["stroked"] = actObj.stroked; // set polygon "style" ( if filled, it will be drawn as a solid polygon on eagle side, if sotrked it will become lines to bypass cutout layer limitation )
    //if(actObj.stroked == true) obj["strokeWidth"] = actObj.strokeWidth;
    if(actObj.stroked == true) obj["strokeWidth"] = parseFloat( rndMm( actObj.strokeWidth) );
    else obj["strokeWidth"] = 0.01; // prevent 0-ed filing & Eagle bug ? -> untested yet but reading the manual, could help ( or not but be adjusted to do so ;p )
    // get all patPoints for that pathItem
    var pathPts = actObj.pathPoints;
    var eagleLinePts = [];

    // fix for 'closed' items, stroked or not
    var firstPathPts = {};
    var lastPathPts = {};

    // loop over those
    for(var j=0; j < (pathPts.length -1); j++){
      var pathPt1 = pathPts[j]; // the point
      var pt1Anch = pathPt1.anchor;  // its anchor
      var p1x = pt1Anch[0];
      var p1y = pt1Anch[1];
      // also get next points info ( to ease later parsing, we change the way path points are stored in the json to something quicker eagle-side )
      var pathPt2 = pathPts[j+1]; // the next point
      var pt2Anch = pathPt2.anchor;  // its anchor
      var p2x = pt2Anch[0];
      var p2y = pt2Anch[1];
      // instead of adding those directly to our array holding the pathPts ready for Eagle, we compute their positions relative to our 'eagle_center'
      var relPt1x = parseFloat( rndMm( p1x - eagleCenterPos['cx'] ) );
      var relPt1y = parseFloat( rndMm( p1y - eagleCenterPos['cy'] ) );
      var relPt2x = parseFloat( rndMm( p2x - eagleCenterPos['cx'] ) );
      var relPt2y = parseFloat( rndMm( p2y - eagleCenterPos['cy'] ) );

      // fix for 'closed' items, stroked or not
      if(j == 0){ // store first point coords
        firstPathPts = { relPt1x: relPt1x, relPt1y: relPt1y, relPt2x: relPt2x, relPt2y: relPt2y };
      //} else if(j == pathPts.length -1){
      } else if(j == pathPts.length -2){
        lastPathPts = { relPt1x: relPt1x, relPt1y: relPt1y, relPt2x: relPt2x, relPt2y: relPt2y };
      }

      // ADDED STEP:
      if(actObj.stroked == true){ // for 'stroked' polygons, we'll draw lines as x1 y1 x2 y2, x2 y2 x3 y3, ..
        eagleLinePts.push([relPt1x, relPt1y, relPt2x, relPt2y]); // actually push a 'UL_WIRE' line to be drawn
      } else { // for 'filled' polygons, we'll draw one polygon as x1 y1 x2 y2 x3 y3 ..
        eagleLinePts.push([relPt1x, relPt1y]); // push a 'UL_POLYGON' path coords
        if(j == pathPts.length -1) eagleLinePts.push([relPt2x, relPt2y]); // for 'filled' polygons, push the last pathPoint item if at the end of the array minus one item  ** TODO: FIX CLOSED POLY VIA THIS LINE OR OTHER BELOW **
        //if(j == pathPts.length -2) eagleLinePts.push([relPt2x, relPt2y]); // for 'filled' polygons, push the last pathPoint item if at the end of the array minus one item
      }

    }
    // fix for closed paths
    if(actObj.closed == true){
      //if(actObj.stroked == true) eagleLinePts.push([lastPathPts.relPt1x, lastPathPts.relPt1y, firstPathPts.relPt2x, firstPathPts.relPt2y]);
      if(actObj.stroked == true) eagleLinePts.push([lastPathPts.relPt2x, lastPathPts.relPt2y, firstPathPts.relPt1x, firstPathPts.relPt1y]); // will it work ?
      //else eagleLinePts.push([lastPathPts.relPt1x, lastPathPts.relPt1y]); // no tested, but sine the above required modding to work, maybe so do the following ? ..
      //else eagleLinePts.push([lastPathPts.relPt1x, lastPathPts.relPt1y]); // should work ? -> well, yeah, wouldn't have ..
      //else eagleLinePts.push([firstPathPts.relPt1x, firstPathPts.relPt1y]); // should work ? TODO: check if this does the trick ;P ** TODO: FIX CLOSED POLY VIA THIS LINE OR OTHER BELOW **
      else {
        //eagleLinePts.push([lastPathPts.relPt1x, lastPathPts.relPt1y]); // THE 4TH POINT WAS MISSING FOR EVERY CLOSED POLY ON EAGLE SIDE ..  --> nope, re-adds 3RD PT ..
        eagleLinePts.push([lastPathPts.relPt2x, lastPathPts.relPt2y]);
        eagleLinePts.push([firstPathPts.relPt1x, firstPathPts.relPt1y]);
      }
    }

    // add the relative points coords to our object
    obj['pathPoints'] = eagleLinePts;
    protograph[singular].push(obj); // add object to "UL_<singular>" array

  } else if(actObj.typename == "GroupItem"){ // else, loop over contaiend items & recurse on each of them TODO: find why it doesn't recurse more than one level ? ..
    var childrenItems = actObj.pathItems;
    //for(var i=0; i < (childrenItems.length -1); i++){ --> TODO: check if this was the faulty -1 stuff ? ( I didn't get any alter with the 'topThreeSidedBar' name ;p ..)
    for(var i=0; i < (childrenItems.length); i++){
      recursivelyParse(childrenItems[i], singular); // recurse
    }
  }
  // -> all items [ should ? ] have been recursively processed at that point
}


// 1:
// look for items on layers that contain specific stuff in their names
// or
// look for items that contain specific stuff in their names
// get the page items
//var pageItems = app.activeDocument.pageItems;
function parseLayers(){
  var layerItems = app.activeDocument.layers;
  var layersItemsDbg = '';
  var layersOfInterest = [];
  for(var i=0; i < layerItems.length; i++){
    // -- debug
    var tmpBuff = ('\n - [' + i + '] ' + layerItems[i].name);
    layersItemsDbg += tmpBuff;

    // -- get only interesting ones
    if ( supportedLayersStr.indexOf(layerItems[i].name) != -1 ){
        layersOfInterest.push(layerItems[i]);
    }

  }
  //alert("Found layers (length: "+layerItems.length+")names:\n" + layersItemsDbg);
  console.log("\nFound layers (length: "+layerItems.length+") names:\n" + layersItemsDbg);
  return layersOfInterest;
}


function processLayers(layesrArr){
  console.log("\nProcessing layers (length: "+layesrArr.length+"):\n" + layesrArr + '\n');
  for(var i=0; i < layesrArr.length; i++){
    var layerName = layesrArr[i].name;
    // process layers depending on their name ( which indicates the type of the inner elements )
    if ( layerName.indexOf('UL_HOLES') !== -1 ){
      //console.log('Processing layer UL_HOLES ..'); // TODO: process UL_HOLES -> for each object within, get attributes, compute attibutes & position
      processLayerContents(layesrArr[i]);
    } else if ( layerName.indexOf('UL_PADS') !== -1 ){
      //console.log('Processing layer UL_PADS ..'); // TODO: process UL_HOLES
      processLayerContents(layesrArr[i]);
    } else if ( layerName.indexOf('UL_SMDS') !== -1 ){
      //console.log('Processing layer UL_SMDS ..'); // TODO: process UL_HOLES
      processLayerContents(layesrArr[i]);
    } else if ( layerName.indexOf('UL_WIRES') !== -1 ){
      //console.log('Processing layer UL_WIRES ..'); // TODO: process UL_HOLES
      processLayerContents(layesrArr[i]);
    } else if ( layerName.indexOf('UL_POLYGONS') !== -1 ){
      //console.log('Processing layer UL_POLYGONS ..'); // TODO: process UL_HOLES
      processLayerContents(layesrArr[i]);
    } else{
      console.log('name doesn\'t contain any parsable type (' + layerName + ')');
    }

  }
  // once all layers have been processed, produce the protograph package.json ;p
  generateJsonFromProtograph();
}

function processLayerContents(layer){
  var layerObjs = layer.pageItems;
  console.log("\nProcessing layer "+layer+" contents (" + layerObjs.length + " objects within it )");
  // loop over objects contained in the layer
  var layerObjsDbg = '';
  for(var i=0; i < layerObjs.length; i++){
    var tmpBuff = ('\n - [' + i + '] ' + layerObjs[i].name + " ("+layerObjs[i].typename+")");
    layerObjsDbg += tmpBuff;

    // -- construct our json structure for the obj --
    // parse the object name for eventual infos
    var obj = parseObjectAttributesFromName(layerObjs[i].name);
    // depending on the type of layer, we should have either paths ( shapes ) or groups ( for UL_PADS to group a hole & a smd, or for UL_WIRES groups )
    if(layer.name.indexOf('UL_HOLES') != -1 || layer.name.indexOf('UL_SMDS') != -1){
      var singular = undefined;
      var actObj = layerObjs[i];
      // parse those ..
      // -- compute infos on the object from its shape(s)
      var cObj = actObj.position;
      cObj[0] += actObj.width/2.0;
      cObj[1] -= actObj.height/2.0;
      /*
      obj['cx'] = rndMm(cObj[0]);
      obj['cx'] = rndMm(cObj[1]);
      obj['cx'] -= eagleCenterPos['cx'];
      obj['cy'] -= eagleCenterPos['cy'];
      */
      //obj['cx'] = parseFloat( eagleCenterPos['cx'] - rndMm(cObj[0] ));
      //obj['cy'] = parseFloat( eagleCenterPos['cy'] - rndMm(cObj[1]) );
      obj['cx'] = parseFloat( rndMm(  cObj[0] - eagleCenterPos['cx'] ) );
      obj['cy'] = parseFloat( rndMm(  cObj[1] - eagleCenterPos['cy'] ) );
      if(layer.name.indexOf('UL_HOLES') != -1){
        singular = "UL_HOLE";
        obj['drill'] = parseFloat(rndMm(actObj.width) ); // circel = whatever width or height, same value :)
      } else if(layer.name.indexOf('UL_SMDS') != -1){
        singular = "UL_SMD";
        obj['dx'] = parseFloat( rndMm(actObj.width) );
        obj['dy'] = parseFloat( rndMm(actObj.height) );
        // R: for SMDS, have the possibility of using a "roundess" atribute in the object name OR by using either a "roundrect" or Effects > Convert to shape > Rounded rect ? [ & then "expand" ? ]
        // TODO: roundness handling other than via attirubtes in name
        // TODO: angle handling ?
      }
      protograph[singular].push(obj); // add object to "UL_HOLE" array


    } else if(layer.name.indexOf('UL_WIRES') != -1){
      // follow thing recursively & add each chunk as a line or a polygon
      var singular = "UL_WIRE";
      var actObj = layerObjs[i];
      //alert("UL_WIRE > Object type: " + actObj.typename);
      //alert("UL_WIRE > Object type: " + actObj.typename + " & name: " + actObj.name);
      //obj['strokeWidth'] = actObj.strokeWidth;
      obj['strokeWidth'] = parseFloat( rndMm( actObj.strokeWidth ) );
      var pathPts = actObj.pathPoints;
      //alert("PathPts length for that path: " + pathPts[0].length);
      var eagleLinePts = [];
      // loop over path points

      // fix for 'closed' items, stroked or not
      var firstPathPts = {};
      var lastPathPts = {};

      for(var j=0; j < (pathPts.length -1); j++){
        var pathPt1 = pathPts[j]; // the point
        var pt1Anch = pathPt1.anchor;  // its anchor
        var p1x = pt1Anch[0];
        var p1y = pt1Anch[1];
        // also get next points info ( to ease later parsing, we change the way path points are stored in the json to something quicker eagle-side )
        var pathPt2 = pathPts[j+1]; // the next point
        var pt2Anch = pathPt2.anchor;  // its anchor
        var p2x = pt2Anch[0];
        var p2y = pt2Anch[1];
        // instead of adding those directly to our array holding the pathPts ready for Eagle, we compute their positions relative tou our 'eagle_center'
        var relPt1x = parseFloat( rndMm( p1x - eagleCenterPos['cx'] ) );
        var relPt1y = parseFloat( rndMm( p1y - eagleCenterPos['cy'] ) );
        var relPt2x = parseFloat( rndMm( p2x - eagleCenterPos['cx'] ) );
        var relPt2y = parseFloat( rndMm( p2y - eagleCenterPos['cy'] ) );
        eagleLinePts.push([relPt1x, relPt1y, relPt2x, relPt2y]);

        // fix for 'closed' items, stroked or not
        if(j == 0){ // store first point coords
          firstPathPts = { relPt1x: relPt1x, relPt1y: relPt1y, relPt2x: relPt2x, relPt2y: relPt2y };
        //} else if(j == pathPts.length -1){
        } else if(j == pathPts.length -2){ // will it work ? --> seems to do the trick ;p
          lastPathPts = { relPt1x: relPt1x, relPt1y: relPt1y, relPt2x: relPt2x, relPt2y: relPt2y };
        }
      }
      // fix for closed paths
      if(actObj.closed == true){
        //eagleLinePts.push([lastPathPts.relPt1x, lastPathPts.relPt1y, firstPathPts.relPt2x, firstPathPts.relPt2y]); // not workng -> gives null stuff ..
        eagleLinePts.push([lastPathPts.relPt2x, lastPathPts.relPt2y, firstPathPts.relPt1x, firstPathPts.relPt1y]); // will it work ? --> seems to
      }

      // add the relative points coords to our object
      obj['pathPoints'] = eagleLinePts;
      protograph[singular].push(obj); // add object to "UL_HOLE" array
    } else if(layer.name.indexOf('UL_POLYGONS') != -1){
      var singular = "UL_POLYGON";
      var actObj = layerObjs[i];
      //alert("UL_POLYGON > Object type: " + actObj.typename);
      recursivelyParse(actObj, singular); // recursively parse Polygon items ( pathItems or grouped ones ) & add corresponding 'formated' arrays ( stroked or filled poly )

    } else if(layer.name.indexOf('UL_PADS') != -1){
      // for square/round/octagonal pads, things could be somewhat ok
      // for offset/long, I guess we'd use the hole position for the relative positionning, & then getting the angle fromthe orientation of the rect within the group ?
      var singular = "UL_PAD";
      var actObj = layerObjs[i];
      //alert("UL_PAD > Object type: " + actObj.typename);
    }
      // For all:
      // compute infos on the object from its shape(s)
      // compute position from 'eagle center crosshair'

  }
  //console.log("\nFound objects names in layer :\n" + layerObjsDbg);
  console.log("\n"+layerObjsDbg);
}


// 2:
// parse additional infos from the names of the parts found in the above step
var dataFromNameField = 'qq trucs lol UL_SMD NAME=monNom FLAGS=firstFlag,secondFlag NOMBRE=13.50987654321';

function parseObjectFromName(dataFromNameField){
  /*
  if( (dataFromNameField.lastIndexOf('UL_SMD'), 0) == 0){
    console.log('name is prefixed by UL_SMD');
  } else
  */
  if ( dataFromNameField.indexOf('UL_SMD') !== -1 ){
    console.log('name contains UL_SMD');
  } else {
    console.log('name doesn\'t contain UL_SMD');
  }
}
//parseObjectFromName(dataFromNameField);

function parseObjectAttributesFromName(dataFromNameField){
  // 1: split  by  space & discard string not containing '='
  //var items = [];
  var attrs = {};
  var splits = dataFromNameField.split(' ');
  for(var i=0; i < splits.length; i++){
    if( splits[i].indexOf('=') !== -1 ){
      // 2: split by '=' to get key & value
      var itemData = splits[i].split('=');
      var key = itemData[0].toLowerCase();
      var value = itemData[1].split(',').join(' '); // replace ',' by ' ' to be ready for json formatting ( directly passed "as is" to Eagle )
      // 2b: mod needed values to get the correct type afterward
      if('roundness angle'.indexOf(key) != -1){
        value = parseFloat(value);
      }
      console.log("- attribute ["+key+"] : value ["+ value + "]\n");
      // 3: add to item as key & values
      //items.push()
      attrs[key] = value;
    }
  }
  return attrs;
}
//var attrs = parseObjectAttributesFromName(dataFromNameField);
//console.log(attrs);



// 3:
// compute infos from the object attributes


// 4:
// compute position of objects relative to the 'center crosshair'


// 5:
// generate & save a .json file from that

// ==== JOSN GENERATION ====
function generateJsonFromProtograph(){
  // TODO: prompt to give a filepath to save the json file
  var jsonContent = JSON.stringify(protograph);
  //var jsonFilePath = File.saveDialog( prompt[, preset] );
  var jsonFilePath = File.saveDialog( "--> Please indicate where to save the package.json file to be imported in Eagle <--" );
  //alert("You selected: " + jsonFilePath); // ex: ~/Documents/espruino_gamepad_hid/espruino-adaptive-controller/easeWorkflowScripts/protographer_package.json

  // check if we can create the file directly or if it already exist
  //var jsonFile = File(jsonFilePath);
  /*
  if( !(jsonFile.exists() ) ){
    jsonFile = new File(jsonFilePath);
  } else {
    var res = confirm("Override existing file ?", true, "titleWINonly");
    if(res==true){return;}
  }
  */
  var jsonFile = new File(jsonFilePath);
  // write to the file
  //var outFile = jsonFile.open("w", undefined, undefined);
  jsonFile.encoding = "UTF_8";
  //outFile.lineFeed = "Unix";
  //outFile.lineFeed = "Windows";
  jsonFile.lineFeed = "Macintosh";

  var outOk = jsonFile.open("w", undefined, undefined);
  if(outOk){
    jsonFile.writeln(jsonContent);
    jsonFile.close(); // --> now open that in Eagle & see the magic happen ? ;P
  }
}


// ==== CONTEXT ====
processLayers( parseLayers() ); // normal launch
//generateJsonFromProtograph(); // debug
