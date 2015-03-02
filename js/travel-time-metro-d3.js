var pixelsPerMinute = 800.0/4800.0;

window.onload = function() {
    createGraph(0);
  
    var optionDonnees = d3.select('#donnees')
        .on('change', function() {
            var box = document.getElementById('donnees');
            d3.select("#map").selectAll("svg").remove();
            createGraph(box.selectedIndex);
        });

    var options = optionDonnees.selectAll('option');
    for(i=0 ; i<donnees.length; i++) {
        options.data([ { id: i, name: donnees[i][0] } ]).enter().append('option').text(donnees[i][0]);
    }
}

function createGraph(idData) {

    if(donnees[idData][1].slice(-4) == ".csv"){
        d3.csv(donnees[idData][1], createStations);
    }else if(donnees[idData][1].slice(-5) == ".json"){
        d3.json(donnees[idData][1], createStations);
    }

    function createStations(stations) {
    
        var w = 800,
            h = 500,
            minLat = 90, 
            minLon = 180, 
            maxLat = -90, 
            maxLon = -180,
            stationsById = {};

        // measure...
        stations.forEach(function(s) {
            stationsById[s.id] = s;
            s.conns = [];
            s.display_name = (s.display_name == 'NULL') ? null : s.display_name;
            s.rail = parseInt(s.rail,10);
            s.totalLines = parseInt(s.total_lines,16);
            //console.log(s.rail, s.totalLines);
            s.latitude = parseFloat(s.latitude);
            s.longitude = parseFloat(s.longitude);
            minLat = Math.min(minLat, s.latitude);
            maxLat = Math.max(maxLat, s.latitude);
            minLon = Math.min(minLon, s.longitude);
            maxLon = Math.max(maxLon, s.longitude);
        });

        var paddingx = 10;
        var paddingy = 10;
      
        var ecartX = maxLon - minLon;
        var ecartY = maxLat - minLat;
      
        if(ecartX/(w-2*paddingx) < ecartY/(h-2*paddingy)) {
            paddingy += (h-2*paddingy-ecartY*(w-2*paddingx)/ecartX)/2;
        }else {
            paddingx += (w-2*paddingx-ecartX*(h-2*paddingy)/ecartY)/2;
        }
      
        stations.forEach(function(s) {
            s.mapx = paddingx + (w-paddingx*2) * (s.longitude-minLon) / (maxLon-minLon);
            s.mapy = h-paddingy - (h-paddingy*2) * (s.latitude-minLat) / (maxLat-minLat);
        });
            
        //console.log(stations);
        if(donnees[idData][2].slice(-4) == ".csv"){
            d3.csv(donnees[idData][2], createRoutes);
        }else if(donnees[idData][2].slice(-5) == ".json"){
            d3.json(donnees[idData][2], createRoutes);
        }

        function createRoutes(connections) {
        
            //console.log(connections);
              
            connections.forEach(function(c) {
                c.station1 = stationsById[c.station1];
                c.station2 = stationsById[c.station2];
                c.station1.conns.push(c);
                //c.station2.conns.push(c);
                c.time = parseInt(c.time,10);
            });
            
            if(donnees[idData][3].slice(-4) == ".csv"){
                d3.csv(donnees[idData][3], createLines);
            }else if(donnees[idData][3].slice(-5) == ".json"){
                d3.json(donnees[idData][3], createLines);
            }

            function createLines(routes) {
            
                //console.log(routes);
                  
                function zoomed() {
                    var visu = d3.select("#visualisation").selectAll("g");
                    visu.selectAll("circle.radius").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    visu.selectAll("line.route").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    visu.selectAll("line.stripe").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                    visu.selectAll("circle.connect").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")").attr("r", 2.5/zoom.scale());
                    visu.selectAll("circle.station").attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")").attr("r", 2.5/zoom.scale());
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

                var radii = d3.range(pixelsPerMinute*600, Math.max(4*w,4*h), pixelsPerMinute*600);
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
                    .attr("class", "route")
                    .attr("stroke", function(d) { return '#'+routesById[d.line].colour; })
                    .attr("stroke-width", 4)
                    .attr("stroke-linecap", 'round')
                    .attr("x1", function(d) { return d.station1.mapx; })
                    .attr("y1", function(d) { return d.station1.mapy; })
                    .attr("x2", function(d) { return d.station2.mapx; })
                    .attr("y2", function(d) { return d.station2.mapy; })
                    .append("svg:title").text(function(d) { return routesById[d.line].name; });

                var stripe = vis.selectAll("line.stripe")
                    .data(connections.filter(function(d) { return d.line != -1 && routesById[d.line].stripe != "NULL"; }))
                    .enter().append("svg:line")
                    .attr("class", "stripe")
                    .attr("stroke", function(d) { return '#'+routesById[d.line].stripe; })
                    .attr("stroke-width", 1)
                    .attr("stroke-linecap", 'round')
                    .attr("x1", function(d) { return d.station1.mapx; })
                    .attr("y1", function(d) { return d.station1.mapy; })
                    .attr("x2", function(d) { return d.station2.mapx; })
                    .attr("y2", function(d) { return d.station2.mapy; });
                    
                var connect = vis.selectAll("circle.connect")
                    .data(stations.filter(function(d) { return d.totalLines - d.rail > 1; }))
                    .enter().append("svg:circle")
                    .attr("class", "connect")
                    .attr("cx", function(d) { return d.mapx; })
                    .attr("cy", function(d) { return d.mapy; })
                    .attr("r", 2)
                    .style("fill", 'white')
                    .style("stroke", 'black')
                    .style("stroke-width", 1);

                var station = vis.selectAll("circle.station")
                    .data(stations)
                    .enter().append("svg:circle")
                    .attr("id", function(d) { return 'station'+d.id })
                    .attr("class", "station")
                    .attr("cx", function(d) { return d.mapx; })
                    .attr("cy", function(d) { return d.mapy; })
                    .attr("r", 2)
                    .style("fill", 'white')
                    .on('click', selectStation)
                    .on('mouseover', function(d,i) {
                        d3.selectAll('#station'+d.id)
                        .attr("r", 3*2/zoom.scale())
                        .style("fill", 'yellow');
                    })
                    .on('mouseout', function(d,i) {
                        d3.selectAll('#station'+d.id)
                        .attr("r", 1.5*2/zoom.scale())
                        .style("fill", 'white');
                    })
                    .append("svg:title").text(function(d) { return d.name });

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
                                   
                function selectStation(d, i) {
                    updateShortestPaths(d, stations);
                                     
                    if (i) {
                        var box = document.getElementById('navi');
                        box.selectedIndex = i+1;
                    }

                    d3.selectAll('circle.radius')
                        .transition()
                        .duration(0)
                        .style("opacity", d ? 1 : 0)
                        .attr("cx", d ? d.x : w/2)
                        .attr("cy", d ? d.y : h/2);
                                     
                    d3.selectAll('circle.connect, circle.station')
                        .transition()
                        .duration(1000)
                        .attr("cx", function(d) { return d.x; })
                        .attr("cy", function(d) { return d.y; })
                        .selectAll("title").text(function(d) { 
                            if(d.timeToCentre == 0){
                                return d.name;
                            }
                            return d.name + " / " + Math.round(d.timeToCentre/60) + "min" });

                    d3.selectAll("line.route, line.stripe")
                        .transition()
                        .duration(1000)
                        .attr("x1", function(d) { return d.station1.x; })
                        .attr("y1", function(d) { return d.station1.y; })
                        .attr("x2", function(d) { return d.station2.x; })
                        .attr("y2", function(d) { return d.station2.y; });
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