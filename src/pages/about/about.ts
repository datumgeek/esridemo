import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { NavController } from 'ionic-angular';
import { EsriLoaderService } from 'angular2-esri-loader';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
})
export class AboutPage implements OnInit {

  aboutmap;

  @ViewChild('aboutmap') mapEl: ElementRef;

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


      this.esriLoader.loadModules(['esri/Map', 'esri/views/SceneView']).then(([Map, SceneView]) => {
        // create the map at the DOM element in this component
        this.aboutmap = new Map({
          basemap: "hybrid",
          ground: "world-elevation",
        });


        // this.mapEl.nativeElement, 
        // Create the SceneView
        var view = new SceneView({
          map: this.aboutmap,
          container: "aboutdiv",
          camera: {
            position: [7.654, 45.919, 5183],
            tilt: 80
          }
        });


      });
    });

  }
}
