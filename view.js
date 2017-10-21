// load javascript librarys for reference
let $ = require('jquery');
let Noise = require('noisejs');
let bootstrapCP = require('bootstrap-colorpicker');
let easystarjs = require('easystarjs');
var easystar = new easystarjs.js();

// object defining the colors for the steps in the map
var pColorSteps = {
    water: '#3498db',
    plains: '#2ecc71',
    forest: '#16a085',
    mountains: '#34495e'
};

// seed for perlin noise generation
var seed;
// seed to hold value of isRandom checkbox
var isRandom = false;

$(document).ready(function(){
    //initialize perlin map object
    var myPerlinMap = new pMap('perlin-canvas');
    // event handler for generate map button
    $('#generate-map-btn').click(function(){
        // grab the value of the seed input
        seed = $('#seed').val();
        // grab the value of the random checkbox input
        isRandom = $('#random-seed-checkbox:checked').length > 0;
        // if the map is supposed to be random or does not have a defined seed, generate a seed
        if (isRandom || !seed)
        {
            seed = Math.random();   
        }
        // generate the perlin map
        myPerlinMap.genMap(seed);
        // set the seed input to have the seed value
        $('#seed').val(seed);
        // enable color picker inputs
        if(myPerlinMap.isGenerated){
            $(':input[type="text"]').each(function(){
                $(this).prop('disabled', false);
            });
        }
    });
    // event handler for spawning the explorer
    $('#start-map-sim').click(function(){
        //myPerlinMap.spawnExplorer();
        myPerlinMap.initBases();
    });
    // call colorpicker on all the inputs that are intended to handle colors
    $('#water-color').attr('value', pColorSteps.water).colorpicker();
    $('#plains-color').attr('value', pColorSteps.plains).colorpicker();
    $('#forest-color').attr('value', pColorSteps.forest).colorpicker();
    $('#mountain-color').attr('value', pColorSteps.mountains).colorpicker();
    // event handler for when step slider changes
    $('input[type="range"]').change(function(){
        $(this).next().text($(this).val());
    });
    // event handler for when a color input changes
    $('.map-color-picker').change(function(){
        switch($(this).attr('data-feature-enum')){
            case 'water':
                pColorSteps.water = $('#water-color').val();
                myPerlinMap.colorFeature(myPerlinMap.wArr, pColorSteps.water);
                break;
            case 'forest':
                pColorSteps.forest = $('#forest-color').val();
                myPerlinMap.colorFeature(myPerlinMap.fArr, pColorSteps.forest);
                break;
            case 'plains':
                pColorSteps.plains = $('#plains-color').val();
                myPerlinMap.colorFeature(myPerlinMap.pArr, pColorSteps.plains);
                break;
            case 'mountain':
                pColorSteps.mountains = $('#mountain-color').val();
                myPerlinMap.colorFeature(myPerlinMap.mArr, pColorSteps.mountains);
                break;
            default:
                break;
        }
    });
});
// map coordinate object
var mapCoord = function(x, y){
    this.x = x;
    this.y = y;
}
// explorer object definition
var explorer = function(coordinate, color){
    this.x = coordinate.x;
    this.y = coordinate.y;
    this.color = color;
    this.stopMovement = function(){
        clearInterval(this.movementInterval);
    };
    this.movementInterval = null;
}

// main map object
var pMap = function(canvasId){
    // array of water coordinates
    this.wArr = [];
    // array of plains coordinates
    this.pArr = [];
    // array of forest coordinates
    this.fArr = [];
    // array of mountain coordinates
    this.mArr = [];
    // perlin map array
    this.perlinValueArr = [];
    // passable terrain array
    this.passableArr = [];
    // explorer array
    this.explorerArr = [];
    // perlin noise object
    this.noise = null;
    // canvas height
    this.height = document.getElementById(canvasId).height;
    // canvas width
    this.width = document.getElementById(canvasId).width;
    // flag for weather the map has been generated
    this.isGenerated = false;
    // canvas element
    this.pCanvas = document.getElementById(canvasId);
    // canvas element context
    this.pContext = document.getElementById(canvasId).getContext('2d');
    // generates a perlin map based on a seed
    this.genMap = function(seed) {
        // ininitalize perlin noise object
        this.noise = new Noise.Noise(seed);
        // set isGenerated flag
        this.isGenerated = true;
        // draw the map
        this.drawMap();
    };
    // draws the perlin map
    this.drawMap = function() {
        this.clearArrs();
        this.initializePerlinMap(this.perlinValueArr);
        this.initializePerlinMap(this.passableArr);
        for (var x = 0; x < this.width; x++){
            for (var y = 0; y < this.height; y++){
                var pValue = this.noise.simplex2(x/100, y/100);
                var pColor = null;
                var isPassable = 0;
                if (pValue < -.65){
                    this.wArr.push(new mapCoord(x,y));
                    this.colorPoint(x, y, pColorSteps.water);
                    pColor = pColorSteps.water;
                }
                else if (pValue < .25){
                    this.pArr.push(new mapCoord(x,y));
                    this.colorPoint(x, y, pColorSteps.plains);
                    pColor = pColorSteps.plains;
                    isPassable = 1;
                }
                else if (pValue < .8){
                    this.fArr.push(new mapCoord(x,y));
                    this.colorPoint(x, y, pColorSteps.forest);
                    pColor = pColorSteps.forest;
                }
                else {
                    this.mArr.push(new mapCoord(x,y));
                    this.colorPoint(x, y, pColorSteps.mountains);
                    pColor = pColorSteps.mountains;
                }
                this.perlinValueArr[x][y] = new this.mapTile(pColor, pValue);
                // x y values are flipped here because of interaction with a* library being used
                this.passableArr[y][x] = isPassable;                    
            }
        }
    };
    // recolors the map
    this.colorMap = function() {
        this.colorFeature(this.wArr, pColorSteps.water);
        this.colorFeature(this.pArr, pColorSteps.plains);
        this.colorFeature(this.fArr, pColorSteps.forest);
        this.colorFeature(this.mArr, pColorSteps.mountains);
    };
    // used for recoloring a specific feature on the map (e.g. forests, mountains)
    this.colorFeature = function(arr, color) {
        for (var i = 0; i < arr.length; i++){
            this.pContext.fillStyle = color;
            var tempCoord = arr[i];
            this.pContext.fillRect(tempCoord.x,tempCoord.y,1,1);
        }
    };
    // colors a single pixel on the canvas
    this.colorPoint = function(x, y, color){
        this.pContext.fillStyle = color;
        this.pContext.fillRect(x, y, 1, 1);
    };
    // clears all arrays used by the perlin map
    this.clearArrs = function(){
        this.pArr = [];
        this.wArr = [];
        this.fArr = [];
        this.mArr = [];
        this.perlinValueArr = [];
        this.passableArr = [];
        for (var i = 0; i < this.explorerArr.length; i++){
            this.explorerArr[i].stopMovement();
        }
        this.explorerArr = [];
    };
    // turns an array into a 2d array the size of the canvas
    this.initializePerlinMap = function(arr){
        for (var i = 0; i < this.width; i++){
            arr[i] = [];
        }
    };
    // map tile object definition
    this.mapTile = function(color, pVal){
        this.color = color;
        this.pValue = pVal;
    };
    // spawns an explorer entity
    this.spawnExplorer = function(){
        var spawnLocation = this.getSpawnLocation();
        var myExplorer = new explorer(spawnLocation, 'black');
        this.colorPoint(myExplorer.x, myExplorer.y, 'black');
        var perlinMap = this;
        this.explorerArr.push(myExplorer);
        var flag = this.spawnFlag();
        this.calculatePath(myExplorer,flag);
    };
    // spawns a flag for an explorer to move to
    this.spawnFlag = function(){
        var flagLocation = this.getSpawnLocation();
        this.colorPoint(flagLocation.x, flagLocation.y, 'red');
        return flagLocation;
    };
    // generates a random valid spawn location
    this.getSpawnLocation = function(x1, x2, y1, y2){
        var validSpawn = false;
        while (!validSpawn){
            var x = Math.floor(Math.random() * (x2 - x1) + x1);
            var y = Math.floor(Math.random() * (y2 - y1) + y1);
            if (this.perlinValueArr[x][y].pValue < .25 && this.perlinValueArr[x][y].pValue >= -.65){
                validSpawn = true;
                return new mapCoord(x, y);
            }
        }
    };
    // get the color data for a location on the map
    this.getLocationColor = function(x, y){
        return this.perlinValueArr[x][y].color;
    };
    // moves an explorer from one location to another
    this.moveExplorer = function(e, x, y){
        this.colorPoint(e.x, e.y, this.getLocationColor(e.x, e.y));
        e.x = x;
        e.y = y;
        this.colorPoint(e.x, e.y, e.color);
    };
    // calculates shortest path from explorer to flag
    this.calculatePath = function(explorer, flag){
        easystar.setGrid(this.passableArr);
        easystar.setAcceptableTiles([1]);
        easystar.enableDiagonals();
        var that = this;
        easystar.findPath(explorer.x, explorer.y, flag.x, flag.y, function(path){
            if (path == null){
                console.log("path not found!");
                console.log(explorer.x + " " + explorer.y + " | flag: " + flag.x + " " + flag.y);
            }
            else{
                var i = 0;
                var tempMovementInterval = setInterval(function() {
                    that.moveExplorer(explorer, path[i].x, path[i].y);
                    i++;
                    if (i >= path.length){
                        clearInterval(tempMovementInterval);
                    }
                }, 100);
            }
        });
        easystar.calculate();
    };
    this.basecamp = function(x1, y1, x2, y2, color, size){
        this.color = color;
        this.size = size;
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
    };
    this.initBases = function(){
        var base1 = new this.basecamp(0,0,100,100,'red',2);
        var base2 = new this.basecamp(300,300,400,400,'yellow',2);
        var baseArr = [base1, base2];
        this.spawnBases(baseArr);
    };
    // spawn a base within the given x , y coordinate pairs (e.g. x1 = 0, y1 = 0, x2=200, y2=200 -> a base somewhere between 0 - 200 on the x axis, and 0 - 200 on the y axis)
    this.spawnBases = function(baseArr){
        baseArr.forEach(function(element) {
            var b = element;
            var center = this.getSpawnLocation(b.x1, b.x2, b.y1, b.y2);
            b.center = {x: center.x, y: center.y};
            var startDraw = {
                x: (center.x - b.size),
                y: (center.y - b.size)
            };
            var endDraw = {
                x: (center.x + b.size),
                y: (center.y + b.size)
            };
            for (var i = startDraw.x; i < endDraw.x; i++){
                for (var j = startDraw.y; j < endDraw.y; j++){
                    this.colorPoint(i, j, b.color);
                }
            }  
        }, this);
    };
}