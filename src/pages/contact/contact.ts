import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { EsriLoaderService } from 'angular2-esri-loader';

@Component({
  selector: 'page-contact',
  templateUrl: 'contact.html'
})
export class ContactPage implements OnInit {

  contactmap;

  @ViewChild('contactmap') mapEl: ElementRef;

  constructor(public navCtrl: NavController, private esriLoader: EsriLoaderService) { }

  ngOnInit() {

    const options = {
      enableHighAccuracy: true, // use any allowed location provider
      timeout: 60000            // it can take quite a while for a cold GPS to warm up
    };

    // Demonstrates starting up geolocation before loading ArcGIS JS API
    // You can also wait until after the map has loaded. It all depends
    // on your requirements.

    this.esriLoader.load({
      url: 'https://js.arcgis.com/4.3/'
    }).then(() => {


      this.esriLoader.loadModules([
        "esri/Map",
        "esri/views/SceneView",
        "esri/layers/FeatureLayer",
        "esri/renderers/SimpleRenderer",
        "esri/symbols/ObjectSymbol3DLayer",
        "esri/symbols/IconSymbol3DLayer",
        "esri/symbols/PointSymbol3D",
        "esri/tasks/QueryTask",
        "esri/tasks/support/Query",
        "esri/widgets/Home",
      ]).then(([
        Map,
        SceneView,
        FeatureLayer,
        SimpleRenderer,
        ObjectSymbol3DLayer,
        IconSymbol3DLayer,
        PointSymbol3D,
        QueryTask,
        Query,
        Home
      ]) => {


        var wellsUrl =
          "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/HarperSumnerOGWells/FeatureServer/0";
        var quakesUrl =
          "https://services.arcgis.com/V6ZHFr6zdgNZuVG0/arcgis/rest/services/ks_earthquakes_since_2000/FeatureServer/0";

        // The clipping extent for the scene
        var kansasExtent = { // autocasts as new Extent()
          xmax: -10834217,
          xmin: -10932882,
          ymax: 4493918,
          ymin: 4432667,
          spatialReference: { // autocasts as new SpatialReference()
            wkid: 3857
          }
        };

        /********************************************************
         * The popupTemplate that will populate the content of the
         * popup when a well feature is selected
         *******************************************************/

        var wellsTemplate = { // autocasts as new PopupTemplate()
          title: "WELL",
          content: "<b>API No.:</b> {API_NUMBER}<br>" +
          "<b>Lease: </b> {LEASE}<br>" +
          "<b>Operator: </b> {CURR_OPERATOR} km<br>" +
          "<b>Drilled: </b> {SPUD}<br>" +
          "<b>Completed: </b> {COMPLETION}<br>" +
          "<b>Status: </b> {STATUS2}<br>" +
          "<b>Depth: </b> {DEPTH} meters<br>",
          fieldInfos: [{
            fieldName: "SPUD",
            format: {
              dateFormat: "short-date"
            }
          }, {
            fieldName: "COMPLETION",
            format: {
              dateFormat: "short-date"
            }
          }, {
            fieldName: "DEPTH",
            format: {
              places: 0,
              digitSeparator: true
            }
          }]
        };

        /*********************************************************
         * Renderer properties for symbolizing wells on the surface
         *********************************************************/

        var wellsSurfaceRenderer = new SimpleRenderer({
          symbol: new PointSymbol3D({
            symbolLayers: [new IconSymbol3DLayer({
              material: {
                color: "#785226"
              },
              resource: {
                primitive: "x"
              },
              size: 4
            })]
          })
        });

        /**************************************************
         * Renderer for symbolizing wells below the surface
         **************************************************/

        var startDate = new Date("Thu Jul 25 2013 00:00:00 GMT-0700 (PDT)");
        var endDate = new Date("Mon Nov 09 2015 00:01:40 GMT-0800 (PST)");

        var wellsDepthRenderer = new SimpleRenderer({
          symbol: new PointSymbol3D({
            symbolLayers: [new ObjectSymbol3DLayer({
              resource: {
                primitive: "cylinder"
              },
              width: 50
            })]
          }),
          visualVariables: [{
            type: "size",
            field: "DEPTH",
            axis: "height",
            stops: [
              {
                value: 1,
                size: -0.3048
              },
              {
                value: 10000,
                size: -3048
              }]
          }, {
            type: "size",
            axis: "width",
            useSymbolValue: true // sets the width to 50m
          }, {
            type: "color",
            field: "SPUD",
            stops: [{
              value: startDate.valueOf(),
              color: "white"
            }, // From mid-2013
            {
              value: endDate.valueOf(),
              color: "red"
            }
            ] // to Nov 2015
          }]
        });

        /**************************************************
         * Layers depicting oil and gas wells in Harper County
         * and Sumner County, Kansas
         **************************************************/

        // Layer for depicting wells below the surface
        var wellsLyr = new FeatureLayer({
          url: wellsUrl,
          definitionExpression: "Status = 'CBM' OR Status = 'EOR' OR Status = 'GAS' OR Status = 'INJ' OR Status = 'O&G' OR Status = 'OIL' OR Status = 'SWD'",
          outFields: ["*"],
          popupTemplate: wellsTemplate,
          renderer: wellsDepthRenderer,
          // This keeps the cylinders from poking above the ground
          elevationInfo: {
            mode: "relative-to-ground",
            offset: -100
          }
        });

        // Layer for depicting well locations on the surface
        var wellsSurfaceLyr = new FeatureLayer({
          url: wellsUrl,
          definitionExpression: "Status = 'CBM' OR Status = 'EDR' OR Status = 'GAS' OR Status = 'INJ' OR Status = 'O&G' OR Status = 'OIL' OR Status = 'SWD'",
          outFields: ["*"],
          popupTemplate: wellsTemplate,
          renderer: wellsSurfaceRenderer,
          elevationInfo: {
            mode: "on-the-ground"
          }
        });

        /********************************************************
         * Renderer for symbolizing earthquakes below the surface
         *
         * Earthquakes will be symbolized as spheres. The size of
         * each will coincide with the magnitude of the earthquake,
         * while the color will indicate the date at which the
         * earthquake occured. The more white the color, the older the
         * earthquake. The deeper the red, the more recent the
         * earthquake occurred.
         *******************************************************/

        var quakesRenderer = new SimpleRenderer({
          symbol: new PointSymbol3D({
            symbolLayers: [new ObjectSymbol3DLayer({
              resource: {
                primitive: "sphere"
              }
            })]
          }),
          visualVariables: [{
            type: "color",
            field: "date_evt",
            stops: [{
              value: startDate.valueOf(),
              color: "white"
            }, // From mid-2013
            {
              value: endDate.valueOf(),
              color: "red"
            }
            ] // to Nov. 2015
          }, {
            type: "size",
            field: "mag",
            axis: "all",
            stops: [
              {
                value: 2,
                size: 100
              },
              {
                value: 5,
                size: 2000
              }]
          }]
        });

        /********************************************************
         * Renderer for symbolizing earthquakes on the surface
         *******************************************************/

        // Quakes will be symbolized as circles
        var surfaceSym = new PointSymbol3D({
          symbolLayers: [
            new IconSymbol3DLayer({
              material: {
                color: [179, 75, 75]
              },
              resource: {
                primitive: "circle"
              }
            })
          ]
        });

        // Symbol size will vary depending on magnitude of the quake
        var quakesSurfaceRenderer = new SimpleRenderer({
          symbol: surfaceSym,
          visualVariables: [{
            type: "size",
            field: "mag",
            axis: "all",
            stops: [
              {
                value: 2,
                size: 3
              },
              {
                value: 5,
                size: 50
              }]
          }]
        });

        /********************************************************
         * The popupTemplate that will populate the content of the
         * popup when an earthquake feature is selected
         *******************************************************/

        var quakeTemplate = { // autocasts as new PopupTemplate()
          title: "{place}",
          content: "<b>Date and time:</b> {date_evt}<br>" +
          "<b>Magnitude (0-10): </b> {mag}<br>" +
          "<b>Depth: </b> {depth} km<br>",
          fieldInfos: [{
            fieldName: "date_evt",
            format: {
              dateFormat: "short-date-short-time"
            }
          }],
          actions: [{
            id: "find-wells",
            title: "Nearby wells"
          }]
        };

        /********************************************************
         * Create earthquakes layers (one on the surface and one
         * below the surface to show actual location).
         *******************************************************/

        // Defines a layer for drawing the exact location of quakes below the surface
        var quakesDepthLyr = new FeatureLayer({
          url: quakesUrl,
          // Show only quakes of magnitude 2.0 or higher
          definitionExpression: "mag >= 2",
          outFields: ["*"],
          renderer: quakesRenderer,
          popupTemplate: quakeTemplate,
          returnZ: true,
          elevationInfo: {
            mode: "relative-to-ground"
          }
        });

        // Defines a layer for depicting quakes on the surface
        var quakesSurfaceLyr = new FeatureLayer({
          url: quakesUrl,
          definitionExpression: "mag >= 2",
          outFields: ["*"],
          renderer: quakesSurfaceRenderer,
          popupTemplate: quakeTemplate,
          opacity: 0.6,
          elevationInfo: {
            mode: "on-the-ground"
          }
        });

        this.contactmap = new Map({
          basemap: "topo",
          layers: [quakesDepthLyr, quakesSurfaceLyr, wellsLyr,
            wellsSurfaceLyr
          ]
        });

        /********************************************************************
         * Create a local scene in south central Kansas
         *
         * To create a local scene, you must set the viewingMode to "local".
         * To define a small, localized area for the view, set
         * the clippingArea property.
         *
         * Assign the map to a SceneView. Disabling the collision property of
         * the constraints will allow the user to navigate the view's camera
         * below the surface.
         ********************************************************************/
        var view = new SceneView({
          container: "contactdiv",
          map: this.contactmap,
          // Indicates to create a local scene
          viewingMode: "local",
          // Use the exent defined in clippingArea to define the bounds of the scene
          clippingArea: kansasExtent,
          extent: kansasExtent,
          // Allows for navigating the camera below the surface
          constraints: {
            collision: {
              enabled: false
            },
            tilt: {
              max: 179.99
            }
          },
          // Turns off atmosphere and stars settings
          environment: {
            atmosphere: null,
            starsEnabled: false
          }
        });

        /********************************************************
         * Set up action for returning the number of wells within
         * 10km of the earthquake.
         *******************************************************/

        var wellsQTask = new QueryTask({
          url: wellsUrl
        });

        // Default parameters for selecting wells within 10km of click
        var wellsBufferParams = new Query({
          spatialRelationship: "esriSpatialRelIntersects",
          distance: 10,
          units: "kilometers",
          where: "Status = 'CBM' OR Status = 'EDR' OR Status = 'GAS' OR Status = 'INJ' OR Status = 'O&G' OR Status = 'OIL' OR Status = 'SWD'"
        });

        view.popup.on("trigger-action", function (event) {
          if (event.action.id === "find-wells") {
            wellsBufferParams.geometry = view.popup.selectedFeature.geometry;
            wellsQTask.executeForCount(wellsBufferParams).then(function (
              response) {
              var results = "<b>" + response +
                "</b> active wells are within 10 km of this earthquake.";
              view.popup.content = results;
            }).otherwise(
              function (err) {
                console.log("action failed: ", err);
              });
          } else {
            return;
          }
        });

        // Set up a home button for resetting the viewpoint to the intial extent
        var homeBtn = new Home({
          view: view
        }, "contacthomediv");
      });
    });
  }
}