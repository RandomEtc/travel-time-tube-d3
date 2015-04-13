var pixelsPerMinute;

var w = width,
    h = height;

var zoomMultiplier = 1;

var choosenData = 0;
var choosenDot = -1;

window.onload = function() {
    
    var split = window.location.hash.indexOf('|');
    
    if(split > 0){
        choosenData = window.location.hash.substring(1, split);
        choosenDot =  window.location.hash.substring(split+1);
    }else if(window.location.hash != ""){
        choosenData = window.location.hash.substring(1);
    }
    
    if(choosenData >= donnees.length){
        choosenData = 0;
    }
    
    createGraph(choosenData);
    
    var optionDonnees = d3.select('#donnees')
        .on('change', function() {
            d3.select("#map").selectAll("svg").remove();
            d3.select('#navi').selectAll("option").remove();
            var box = document.getElementById('donnees');
            createGraph(box.selectedIndex);
            window.location.hash = box.selectedIndex;
            choosenData = box.selectedIndex;
            choosenDot = -1;
        });

    var options = optionDonnees.selectAll('option');
    for(i=0 ; i<donnees.length; i++) {
        if(i == choosenData){
            options.data([ { id: i, name: donnees[i][0] } ]).enter().append('option').attr("selected", "selected").text(donnees[i][0]);
        }else{
            options.data([ { id: i, name: donnees[i][0] } ]).enter().append('option').text(donnees[i][0]);
        }
    }
}

function createGraph(idData) {

    pixelsPerMinute = zoomMultiplier * donnees[idData][4];
    if(donnees[idData][1].slice(-4) == ".csv"){
        d3.csv(donnees[idData][1], createStations);
    }else if(donnees[idData][1].slice(-5) == ".json"){
        d3.json(donnees[idData][1], createStations);
    }

    function createStations(stations) {

        var minLat = 90, 
            minLon = 180, 
            maxLat = -90, 
            maxLon = -180,
            stationsById = {};

        // measure...
        var i = 0;
        stations.forEach(function(s) {
            stationsById[s.id] = s;
            s.conns = [];
            s.display_name = (s.display_name == 'NULL') ? null : s.display_name;
            s.rail = parseInt(s.rail,10);
            s.totalLines = parseInt(s.total_lines,16);
            s.latitude = parseFloat(s.latitude);
            s.longitude = parseFloat(s.longitude);
            s.index = i++;
            minLat = Math.min(minLat, s.latitude);
            maxLat = Math.max(maxLat, s.latitude);
            minLon = Math.min(minLon, s.longitude);
            maxLon = Math.max(maxLon, s.longitude);
        });

        var paddingx = 10;
        var paddingy = 10;

        var ecartX = maxLon - minLon;
        var ecartY = maxLat - minLat;

        if(ecartX/(w-2*paddingx) > ecartY/(h-2*paddingy)) {
            paddingy += (h-2*paddingy-ecartY*(w-2*paddingx)/ecartX)/2;
        }else {
            paddingx += (w-2*paddingx-ecartX*(h-2*paddingy)/ecartY)/2;
        }

        stations.forEach(function(s) {
            s.mapx = paddingx + (w-paddingx*2) * (s.longitude-minLon) / (maxLon-minLon);
            s.mapy = h-paddingy - (h-paddingy*2) * (s.latitude-minLat) / (maxLat-minLat);
        });

        if(donnees[idData][2].slice(-4) == ".csv"){
            d3.csv(donnees[idData][2], createRoutes);
        }else if(donnees[idData][2].slice(-5) == ".json"){
            d3.json(donnees[idData][2], createRoutes);
        }

        function createRoutes(connections) {

            connections.forEach(function(c) {
                c.station1 = stationsById[c.station1];
                c.station2 = stationsById[c.station2];
                c.station1.conns.push(c);
                c.time = parseInt(c.time,10);
            });

            if(donnees[idData][3].slice(-4) == ".csv"){
                d3.csv(donnees[idData][3], createLines);
            }else if(donnees[idData][3].slice(-5) == ".json"){
                d3.json(donnees[idData][3], createLines);
            }

            function createLines(routes) {

                function zoomed() {
                    var visu = d3.select("#visualisation").selectAll("g");
                    visu.selectAll("circle.radius").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    visu.selectAll("line.route").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    visu.selectAll("circle.station").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")").attr("r", 2.5/zoom.scale());
                    visu.selectAll("text.terminusText").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")").style("font-size", 10/zoom.scale() + "px");
                }

                var routesById = {};
 
                routes.forEach(function(r) {
                    routesById[r.line] = r;
                });

                var zoom = d3.behavior.zoom()
                    .center([w / 2, h / 2])
                    .scaleExtent([0.01, 30])
                    .on("zoom", zoomed);

                var vis = d3.select("#map")
                    .append("svg:svg")
                    .attr("id", "visualisation")
                    .attr("width", w)
                    .attr("height", h)
                    .append("svg:g")
                    .call(zoom);

                var radii = d3.range(pixelsPerMinute*600, Math.max(2*w,2*h), pixelsPerMinute*600);
                    radii.reverse();

                var radius = vis.selectAll('circle.radius')
                    .data(radii)
                    .enter().append('svg:circle')
                    .attr('class','radius')
                    .attr('fill',function(d,i) { return i%2==0 ? '#e6e6e6' : '#fff' })
                    .attr('cx',w/2)
                    .attr('cy',h/2)
                    .attr('r',Number)
                    .style('opacity',0);

                var route = vis.selectAll("line.route")
                    .data(connections.filter(function(d) { return d.line != -1; }))
                    .enter().append("svg:line")
                    .attr("class", function(d) { return (routesById[d.line].stripe != "NULL")?"route stripe":"route"; })
                    .attr("stroke", function(d) { return '#'+routesById[d.line].colour; })
                    .attr("stroke-linecap", 'round')
                    .attr("x1", function(d) { return d.station1.mapx; })
                    .attr("y1", function(d) { return d.station1.mapy; })
                    .attr("x2", function(d) { return d.station2.mapx; })
                    .attr("y2", function(d) { return d.station2.mapy; })
                    .append("svg:title").text(function(d) { return routesById[d.line].name; });

                var station = vis.selectAll("circle.station")
                    .data(stations)
                    .enter().append("svg:circle")
                    .attr("id", function(d) { return 'station'+d.id })
                    .attr("class", function(d) { return (d.totalLines - d.rail > 1)?"station connect":"station"; })
                    .attr("cx", function(d) { return d.mapx; })
                    .attr("cy", function(d) { return d.mapy; })
                    .attr("r", 2)
                    .on('click', selectStation)
                    .on('touch', selectStation)
                    .append("svg:title").text(function(d) { return d.name });

                vis.selectAll("g")
                    .data(stations.filter(function(d) { return d.terminus && d.terminus == "1"; }))
                    .enter()
                    .append("svg:text")
                    .attr("x", function(d) { return d.mapx; })
                    .attr("y", function(d) { return d.mapy; })
                    .attr("class", "terminusText stationName")
                    .on('click', selectStation)
                    .on('touch', selectStation)
                    .text(function(d) { return d.name; })

                vis.append("svg:image")
                    .attr('x',0)
                    .attr('y',0)
                    .attr('width', 32)
                    .attr('height', 32)
                    .attr('id', "expand")
                    .attr("xlink:href","img/expand.png")
                    .on('click', switchSize)
                    .on('touch', switchSize);

                var option = d3.select('#navi')
                    .on('change', function() {
                        var box = document.getElementById('navi'),
                        destination = box.options[box.selectedIndex].value;
                        selectStation(stationsById[destination]);
                    })
                    .selectAll('option')
                    .data( [ { id: 0, name: "Arrangement geographique" } ].concat(stations) )
                    .enter()
                    .append('option')
                    .attr('value', function(d) { return d.id })
                    .text(function(d) { return d.name });

                window.onkeyup = function(e) {
                    if (String.fromCharCode(e.keyCode).toLowerCase() == 'g') {
                        var box = document.getElementById('navi');
                        box.selectedIndex = 0;
                        selectStation(null);
                    }
                }
                
                setTimeout(function(){
                        if(choosenDot > -1){
                            var box = document.getElementById('navi'),
                            destination = box.options[choosenDot].value;
                            selectStation(stationsById[destination]);
                        }
                    }, 100);

                function selectStation(d) {
                    updateShortestPaths(d, stations);
                                     
                    if (d) {
                        var box = document.getElementById('navi');
                        box.selectedIndex = d.index+1;
                        window.location.hash = choosenData + "|" + (d.index+1);
                        choosenDot = d.index+1;
                    }else{
                        window.location.hash = choosenData;
                    }

                    d3.selectAll('circle.radius')
                        .transition()
                        .duration(0)
                        .style("opacity", d ? 1 : 0)
                        .attr("cx", d ? d.x : w/2)
                        .attr("cy", d ? d.y : h/2);
                                     
                    d3.selectAll('circle.station')
                        .transition()
                        .duration(1000)
                        .attr("cx", function(d) { return d.x; })
                        .attr("cy", function(d) { return d.y; })
                        .selectAll("title").text(function(d) { 
                            if(d.timeToCentre == 0){
                                return d.name;
                            }
                            return d.name + " / " + Math.round(d.timeToCentre/60) + "min" });

                    d3.selectAll("line.route")
                        .transition()
                        .duration(1000)
                        .attr("x1", function(d) { return d.station1.x; })
                        .attr("y1", function(d) { return d.station1.y; })
                        .attr("x2", function(d) { return d.station2.x; })
                        .attr("y2", function(d) { return d.station2.y; });
                        
                    d3.selectAll('text.terminusText')
                        .transition()
                        .duration(1000)
                        .attr("x", function(d) { return d.x; })
                        .attr("y", function(d) { return d.y; })
                };
            } // load Lines
        } // load Routes
    } // load Stations
}

// cribbed from here in double quick time: http://www.cs.cmu.edu/~crpalmer/sp/
function updateShortestPaths(centre, stations) {

    if (!centre) {
        stations.forEach(function(s) {
            s.x = s.mapx;
            s.y = s.mapy;
            s.timeToCentre = 0;
        });  
        return;
    }

    stations.forEach(function(s) {
        s.timeToCentre = (s == centre) ? 0 : Number.MAX_VALUE;
        s.pathParent = null;
    });

    var queue = [];
    queue.push(centre); 
  
    function compareTimes(a,b) {
        return a.timeToCentre < b.timeToCentre ? -1 : a.timeToCentre > b.timeToCentre ? 1 : 0;
    }

    while (queue.length > 0) {
        queue.sort(compareTimes);
        var v = queue.pop();
        for (var i = 0; i < v.conns.length; i++) {
            var c = v.conns[i];
            var u = (c.station1 == v) ? c.station2 : c.station1;
            if (c.time + v.timeToCentre < u.timeToCentre) {
                u.pathParent = v;
                u.timeToCentre = c.time + v.timeToCentre;
                queue.push(u);
            }
        }
    }

    stations.forEach(function(s) {
        var ang = Math.atan2(s.mapy - centre.mapy, s.mapx - centre.mapx),
            rad = pixelsPerMinute * s.timeToCentre; // todo: limit to min(width/2,height/2)?
        s.x = centre.mapx + (rad * Math.cos(ang));
        s.y = centre.mapy + (rad * Math.sin(ang));
    });
}

function switchSize(){
    margins = 20;
    if(h == height && w == width){
        changeH = window.innerHeight - 2 * margins;
        changeW = window.innerWidth - 2 * margins;
        zoomMultiplier = 1.25 * changeW / w;
    }else{
        changeH = height;
        changeW = width;
        zoomMultiplier = 1;
    }
    d3.select("#map")
        .transition()
        .duration(1000)
        .each("end", function() {document.getElementById('map').scrollIntoView(true);})
        .attr("width", changeW + "px")
        .attr("height", changeH + "px")
        .style({"width": changeW + "px","height": changeH + "px"});

    d3.select("#map").selectAll("svg").remove()
    h = changeH;
    w = changeW;
    var box = document.getElementById('donnees');
    createGraph(box.selectedIndex);    
}