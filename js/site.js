let urbanURL = encodeURIComponent('https://test-data.humdata.org/dataset/dc9da294-26af-4f22-9f0c-8acfb0cdf17e/resource/599be5e3-35ad-4352-8fa8-377b085ab861/download/urban_consumption.csv');
let slumURL = encodeURIComponent('https://test-data.humdata.org/dataset/dc9da294-26af-4f22-9f0c-8acfb0cdf17e/resource/a3d57e6c-627a-4279-b5d7-06d6d1e16f8c/download/slum_consumption.csv');
let ruralURL = encodeURIComponent('https://test-data.humdata.org/dataset/dc9da294-26af-4f22-9f0c-8acfb0cdf17e/resource/061b343d-6fd8-4505-97f2-9ebd46728968/download/rural_consumption.csv');
let nonCampURL = 'https://test-data.humdata.org/hxlproxy/data.json?filter01=add&add-tag01=%23indicator%2Blocation&add-value01=urban&filter02=append&append-dataset02-01='+slumURL+'&filter03=replace&replace-pattern03=%5E%24&replace-regex03=on&replace-value03=slum&replace-tags03=%23indicator%2Blocation&filter04=append&append-dataset04-01='+ruralURL+'&filter05=replace&replace-pattern05=%5E%24&replace-regex05=on&replace-value05=rural&replace-tags05=%23indicator%2Blocation&filter06=select&select-query06-01=%23indicator%2Btier%3DBaseline&strip-headers=on&url='+urbanURL;

let campURL = encodeURIComponent('https://test-data.humdata.org/dataset/dc9da294-26af-4f22-9f0c-8acfb0cdf17e/resource/54992e56-7918-4c05-84b2-2a7bef4f95cd/download/camp_consumption.csv');
let largeCampsURL = 'https://test-data.humdata.org/hxlproxy/data.json?filter01=select&select-query01-01=%23indicator%2Btier%3DBaseline&strip-headers=on&url='+campURL;
let smallCampsURL = '';

function hxlProxyToJSON(input){
    let output = [];
    let keys=[]
    input.forEach(function(e,i){
        if(i==0){
            e.forEach(function(e2,i2){
                let parts = e2.split('+');
                let key = parts[0]
                if(parts.length>1){
                    let atts = parts.splice(1,parts.length);
                    atts.sort();                    
                    atts.forEach(function(att){
                        key +='+'+att
                    });
                }
                keys.push(key);
            });
        } else {
            let row = {};
            e.forEach(function(e2,i2){
                row[keys[i2]] = e2;
            });
            output.push(row);
        }
    });
    return output;
}

function generateMap(geom,data,countryOverview) {
    //remove loader
    $('.sp-circle').remove();

    let baselayer = L.tileLayer('https://data.humdata.org/mapbox-base-tiles/{z}/{x}/{y}.png', {});
    let labels = L.tileLayer('https://data.humdata.org/mapbox-layer-tiles/{z}/{x}/{y}.png', {minZoom: 2, pane: 'labels'});

    map = L.map('map',{
        center: [0,0],
        zoom: 2,
        layers: [baselayer]
    });

    map.createPane('labels');

    let cls;
    let style = function(feature) {
        let clr = '#aaaaaa';
        let borderClr = '#f2f2ef';
        let fillClr = '#08306b';
        let fillOpacity = 0;
        cls = 'country'

        let iso3 = feature.properties['ISO_3'];
        if (iso3!=null) {
            let num = data[iso3.toLowerCase()];
            if (num!=undefined) {
                clr = getColor(num);
                fillOpacity = 0.7;
                cls = '';
            }
            else {
                cls = 'no-data';
            }
        }

        return {
            color: borderClr,
            fillColor: clr,
            weight: 1,
            opacity: 1,
            fillOpacity: fillOpacity,
            className: cls
        };
    }

    map.overlay = L.geoJson(geom, {
        style: style,
        onEachFeature: function (feature, layer) {
            feature.properties.bounds_calculated = layer.getBounds();
            if (cls != 'no-data') {
                layer.on({
                    click: mapClick
                });
            }
        }
    }).addTo(map);

    map.getPane('labels').style.zIndex = 650;
    map.getPane('labels').style.pointerEvents = 'none';

    labels.addTo(map);
}

function getColor(d) {
    return  d > 500000 ? '#005984' :
            d > 100000 ? '#267195' :
            d > 50000  ? '#4C89A6' :
            d > 10000  ? '#72A2B7' :
            d > 5000   ? '#98BAC8' :
            d > 1000   ? '#BED2D9' :
                         '#E4EBEB' ;
}

function generateMapLegend() {
    let legend = $('#mapLegend');
    let colors = {'500,000': '#005984', '100,000':'#267195', '50,000': '#4C89A6', '10,000': '#72A2B7', '5,000': '#98BAC8', '1,000': '#BED2D9'};

    legend.append('<h5>Refugee Population</h5><ul></ul>');
    for (let key in colors) {
        legend.find('ul').append('<li><div class="color" style="background-color:' + colors[key] + '"></div> ' + key + '</li>');
    }
}

function mapClick(e) {
    let iso3 = e.target.feature.properties['ISO_3'].toLowerCase();
    countryOverview(iso3);
    $('#countryModal').modal('show');

    cookingChart.flush();
    lightingChart.flush();

    for (var i=0; i<charts.length; i++) {
        charts[i].flush();
    }
    charts = [];
}

function buildModalOverview(iso3, cooking, lighting) {
    let expTotalCooking = 0;
    let expTotalLighting = 0;
    let popTotal = refugeePopData[iso3];
    let modal = $('#countryModal');

    //country title
    modal.find('.modal-title').text(countryNames[iso3]);

    //pre-populate feedback form link
    setFormLink(countryNames[iso3]);
    
    //cooking
    let cookingData = [];
    for (let prop in cooking) {
        expTotalCooking = (cooking[prop]==undefined) ? expTotalCooking : expTotalCooking + cooking[prop];
        cookingData.push([prop, numFormat(cooking[prop])]);
    }

    //lighting
    let lightingData = [];
    for (let prop in lighting) {
        expTotalLighting = (lighting[prop]==undefined) ? expTotalLighting : expTotalLighting + lighting[prop];
        lightingData.push([prop, numFormat(lighting[prop])]);
    }

    //totals
    modal.find('.overview-cooking .exp-total span').text( '$'+numFormat(expTotalCooking)+'M' );
    modal.find('.overview-cooking .exp-percapita span').text( getExpPerCapita(expTotalCooking, popTotal) );
    modal.find('.overview-lighting .exp-total span').text( '$'+numFormat(expTotalLighting)+'M' );
    modal.find('.overview-lighting .exp-percapita span').text( getExpPerCapita(expTotalLighting, popTotal) );

    //pie charts
    cookingChart = buildPieChart('cooking', cookingData, 200);
    lightingChart = buildPieChart('lighting', lightingData, 200);
}

function buildModalInfo(camp) {
    let expTotalCooking = 0;
    let expTotalLighting = 0;
    let campCls = 'camp'+camp.id;
    let cookingChartID = 'cooking'+camp.id+'Chart';
    let lightingChartID = 'lighting'+camp.id+'Chart';
    let modal = $('#countryModal');

    //cooking
    let cookingData = [];
    for (let key in camp.cooking) {
        expTotalCooking = (camp.cooking[key]==undefined) ? expTotalCooking : expTotalCooking + camp.cooking[key];
        cookingData.push([key, numFormat(camp.cooking[key])]);
    }

    //lighting
    let lightingData = [];
    for (let key in camp.lighting) {
        expTotalLighting = (camp.lighting[key]==undefined) ? expTotalLighting : expTotalLighting + camp.lighting[key];
        lightingData.push([key, numFormat(camp.lighting[key])]);
    }

    modal.find('.info .location').append('<div class="row camp '+campCls+'"><div class="col-sm-2 col-xs-12 info-labels">'+camp.name+'</div><div class="col-xs-2" id="'+ cookingChartID +'"></div><div class="col-sm-3 col-xs-4 cooking"></div><div class="col-xs-2" id="'+lightingChartID+'"></div><div class="col-sm-3 col-xs-4 lighting"></div></div>');

    //totals
    modal.find('.'+campCls+' .cooking').html( 'Exp: $'+numFormat(expTotalCooking)+'M<br>Per Cap: '+ getExpPerCapita(expTotalCooking, camp.pop) );
    modal.find('.'+campCls+' .lighting').html( 'Exp: $'+numFormat(expTotalLighting)+'M<br>Per Cap: '+ getExpPerCapita(expTotalLighting, camp.pop) );

    //pie charts
    let cookingChart = buildPieChart('cooking'+camp.id, cookingData, 70, false);
    let lightingChart = buildPieChart('lighting'+camp.id, lightingData, 70, false);

    //save reference to charts
    charts.push(cookingChart);
    charts.push(lightingChart);
}

function buildPieChart(title, data, height, showLegend=true) {
    let clrs = (title.indexOf('cooking')>-1) ? 'cooking' : 'lighting';
    let chart = c3.generate({
        bindto: '#'+title+'Chart',
        data: {
            columns: data,
            type : 'pie',
            color: function (color, d) {
                // d will be 'id' when called for legends
                var colors = pieColors[clrs];
                if(typeof d === 'object') {
                    return colors[d.id];
                }else {
                    return colors[d];
                }
            }
        },
        size: { height: height },
        //color: { pattern: pieColors[clrs] },
        pie: {
            label: {
                format: function (value, ratio, id) {
                    return d3.format('$')(value)+'M';
                },
                threshold: 0.05
            }
        },
        legend: {
            position: 'right',
            show: showLegend
        }
    });
    return chart;
}

function buildLegend() {
    let legend = $('#countryModal').find('#legend');
    for (let pie in pieColors) {
        let leg = legend.find('.'+pie+'Legend ul');
        for (let color in pieColors[pie]) {
            leg.append('<li><div class="square" style="background-color:' + pieColors[pie][color] + '"></div> ' + color + '</li>');
        }
    }
}

function setFormLink(country) {
    $('.form-link').attr('href', 'https://docs.google.com/forms/d/e/1FAIpQLSdRLnbL31zoyNunwPhfrSXzkf7FCTFHRS0jHK8n736W7o58Hw/viewform?usp=pp_url&entry.1658201850=' + country + '&entry.1869536362');
}

function getExpPerCapita(total, pop) {
    if (pop<=0)
        return '$'+numFormat(0);
    else
        return '$'+numFormat((total*1000000)/pop);
}

function getRefugeesPerCountry(datasets){
    let output = {};
    datasets.forEach(function(dataset){
        dataset.forEach(function(row){
            let country = row['#country+code'];
            if(output[country]===undefined){
                output[country] = Math.round(Number(row['#population+hh+num']));
            } else {
                output[country] += Math.round(Number(row['#population+hh+num']));
            }
        });      
    });
    return output;
}

function getCountryNames(datasets) {
    let output = {};
    datasets.forEach(function(row){
       output[row.code.toLowerCase()] = row.name;
    });
    return output;
}


let numFormat = function(d){return d3.format('.2f')(d)};

let nonCampCall = $.ajax({ 
    type: 'GET', 
    url: nonCampURL,
    dataType: 'json',
});

let largeCampCall = $.ajax({ 
    type: 'GET', 
    url: largeCampsURL,
    dataType: 'json',
});

let geomCall = $.ajax({ 
    type: 'GET', 
    url: 'data/geom.json',
    dataType: 'json',
});

let countriesCall = $.ajax({ 
    type: 'GET', 
    url: 'data/countries.json',
    dataType: 'json',
});

let countryOverview, refugeePopData, countryNames;
let cookingChart, lightingChart;
let charts = [];
let lightingColors = {'On grid':'#629C8D','Torch-dependent':'#7CAB9F','Kerosene-dependent':'#96BBB2','Solar/mini-grid':'#B0CBC5','Solar/diesel':'#CADBD8','Solar-dependent':'#E4EBEB'};
let cookingColors = {'Non Solid':'#005984','Firewood-dependent':'#267195','Firewood mix':'#4C89A6','Kerosene dependent':'#72A2B7','LPG fuelled':'#98BAC8','Alternative biomass':'#BED2D9'};
let pieColors = {'cooking':cookingColors,'lighting':lightingColors};

$.when(nonCampCall,largeCampCall,geomCall,countriesCall).then(function(nonCampArgs,largeCampArgs,geomArgs,countriesArgs){
    let nonCampData = hxlProxyToJSON(nonCampArgs[0]);
    let largeCampData = hxlProxyToJSON(largeCampArgs[0]);
    let geomData = topojson.feature(geomArgs[0],geomArgs[0].objects.geom);
    refugeePopData = getRefugeesPerCountry([nonCampData, largeCampData]);
    countryNames = getCountryNames(countriesArgs[0].countries);

    countryOverview = function(iso3) {
        let lighting = {};
        let cooking = {};
        let camps = [];

        nonCampData.forEach(function(row){
            if(row['#country+code']===iso3){
                let key = 'On grid';
                let value = Number(row['#indicator+expenditure+grid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }

                key = row['#indicator+lighting+text'];
                value = Number(row['#indicator+expenditure+offgrid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }
                
                key = 'Non Solid';
                value = Number(row['#indicator+expenditure+nonsolid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }

                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        largeCampData.forEach(function(row){
            if(row['#country+code']===iso3){
                key = row['#indicator+lighting+text'];
                value = Number(row['#indicator+expenditure+offgrid+value']);
                camps.push(row['#loc+name']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }
                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        //country overview data for cooking and lighting
        //could use total as per capita rate as headline figures
        // console.log('Country Overview');
        // console.log(lighting);
        // console.log(cooking);
        // console.log('Example - urban sub cateogry');
        // subCountryOverview(iso3,'urban');
        //console.log('Example - camp');  
        //campOverview('Buramino : Point');

        //build modal    
        buildModalOverview(iso3, cooking, lighting);

        //clear the info columns in modal
        $('#countryModal').find('.camp').remove();

        //get noncamp info
        subCountryOverview(iso3);

        //get camp info
        camps.forEach(function(camp, id) {
            //+100 so ids dont overlap with noncamp ids
            campOverview(camp, id+100);
        });
    }

    let campOverview = function(campname, id){
        let camp = {'name':campname, 'id': id};
        let lighting = {};
        let cooking = {};
        largeCampData.forEach(function(row){
            if(row['#loc+name']===campname){
                let key = row['#indicator+lighting+text'];
                let value = Number(row['#indicator+expenditure+offgrid+value']);
                camp.pop = Number(row['#population+hh+num']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }

                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        //result of particular camp
        // console.log('lighting',lighting);
        // console.log('cooking',cooking);      

        //build modal  
        camp.cooking = cooking;
        camp.lighting = lighting;
        buildModalInfo(camp);
    }

    let subCountryOverview = function(iso3){
        let noncamp = {'name':'Non-camp', 'id':0};
        let lighting = {};
        let cooking = {};
        noncamp.pop = 0;
        nonCampData.forEach(function(row){
            if(row['#country+code']===iso3){
                let key = 'On grid';
                let value = Number(row['#indicator+expenditure+grid+value']);
                noncamp.pop += Math.round(row['#population+hh+num']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }

                key = row['#indicator+lighting+text'];
                value = Number(row['#indicator+expenditure+offgrid+value']);
                if(lighting[key] === undefined){
                    lighting[key] = value;
                } else {
                    lighting[key] += value;
                }
                
                key = 'Non Solid';
                value = Number(row['#indicator+expenditure+nonsolid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }

                key = row['#indicator+cooking+text'];
                value = Number(row['#indicator+expenditure+solid+value']);
                if(cooking[key] === undefined){
                    cooking[key] = value;
                } else {
                    cooking[key] += value;
                }                
            }
        });

        //country overview data for cooking and lighting
        //could use total as per capita rate as headline figures
        // console.log(lighting);
        // console.log(cooking); 


        //build modal  
        noncamp.cooking = cooking;
        noncamp.lighting = lighting;
        buildModalInfo(noncamp);
    }

    generateMap(geomData,refugeePopData,countryOverview);
    generateMapLegend();
    buildLegend();
});