### References

Nb: the Eagle Help menu is complementary to the manual ( is almost as useful as stackoverflow answers & forums digging .. )
- https://www.adobe.com/content/dam/acom/en/devnet/illustrator/pdf/illustrator_scripting_reference_javascript_cs5.pdf
- http://dl36mmdz94630.cloudfront.net/uploads/eagle_resources/files/000/002/319/original/ulp5110_en.pdf?1484968000

Unnoficial docs
- https://github.com/rjduran/adobe-scripting#save-files
- http://web.mit.edu/xavid/arch/i386_rhel4/help/


### Features to be added ?
Getting enough anchor pts for a particular resolution to get neat curves
- https://github.com/shspage/illustrator-scripts
- klts 21 juil. 2015 15:27 (en réponse à pixxxel schubser): https://forums.adobe.com/message/7759845#7759845
- digg toPantone: https://github.com/johnwun/js4ai


### KiCad scripting & stuff
- https://kicad.mmccoo.com
- 


### Related
- https://www.instructables.com/id/Adding-Custom-Graphics-to-EAGLE-PCB-Layouts/
- 

### Protographer summary


Tested on Eagle 9.0.1 & Illustrator CS5 ( yup ! )

The "Protographer" is divided in three parts:
- an Adobe Illustrator template ( .ai ) file, with the ~std layers organisation
- an Adobe Illustrator plugin ( JSX )that exports supported stuff to a "package" .json file
- an Autodesk Eagle plugin ( ULP ) that imports a "package" .json file to generate stuff in a "Package Editor" window

Both plugin allows to specify the .json file to save/import

The mapping from Illustrator PathItems to Eagle objects allows to set additional Eagle attributes from the PathItem name,
while most of the Eagle objects attributes ( such as dimensions & position ) will be automatically set

/!\ Illustrator "compound path" are NOT supported ( shapes currently have to be pre-cut so that they always have a "free" edge )

To use additional attributes, specify them as XX=YY paris in the PathItem name
```
NAME=C1 LAYER=1 ROUNDNESS=0.0 ANGLE=0.0 FLAGS= // here , 'FLAG=' will set the FLAGS as an empty string
```

Currently supported layers are
```
- UL_PADS // 'll generate pads - currently not yet parsed from the Illustrator file
- UL_SMDS // 
- UL_HOLES // 'll generate drill holes 
- UL_WIRES // 'll generate strokes
- UL_POLYGONS // 'll generate either strokes or polygons depending on whether the polygon is closed or not
```

Main goals:
- quickly draw a basic footprint when none is available & no datasheet may be either
- be able to directly set some SMD & PADS names as well as other attributes if needed
- provide an alternative way ( other than dxf ) to import vector graphics from Illustrator

The plugins are both between a POC & a very early alpha stagen so care should be taken while using those ;)

A plugin to import the .json file in other software ( like KiCad for ex ) is surely possible, but I don't
have either the knowledge or the time to do so yet :/ ;)

Last but not least, even in Fusion360 may be some neat tool to draw blueprints from measurements or datasheets,
I'm currently more confident with Illustrator & feel it gives more freedom while working in purely 2d, reason why I wrote
those plugins ( as well as learn more on scripting & specifics on ExtendScript & ULP's ;p )

On the above --> https://forums.autodesk.com/t5/eagle-forum/feature-request-proper-import-of-polygons-and-vectors-from-svg/td-p/6852461/page/2

Hoping this will be useful to some reader passing by ..

An example of exported objects
```javascript
// UL_HOLE
{
      "cx": -2.49,
      "cy": -3.51,
      "drill": 1.38
    },
// UL_PAD
{
      "cx": 5.0,
      "cy": -25.0,
      "diameter": 5.0,
      "drill": 1.5,
      "shape": "Offset",
      "angle": 45,
      "flags": "NOSTOP NOTHERMALS FIRST",
      "name": "P5",
    },
// UL_SMD
{
      "name": "C1",
      "layer": "1",
      "roundness": 0,
      "angle": 0,
      "flags": "",
      "cx": -7.38,
      "cy": -4.31,
      "dx": 2.52,
      "dy": 5.3
    },
// UL_WIRE
{
      "strokeWidth": 0.35,
      "pathPoints": [
        [
          8.65,
          9.63,
          8.65,
          10.92
        ],
        [
          8.65,
          10.92,
          -8.65,
          10.92
        ],
        [
          -8.65,
          10.92,
          -8.65,
          9.63
        ],
        [
          -8.65,
          9.63,
          8.65,
          9.63
        ]
      ]
    },
// UL_POLYGON --> this one isn't filled, so will be generated as lines since 'cutout" style is available only for signal layers
{
      "stroked": true,
      "strokeWidth": 0.04,
      "pathPoints": [
        [
          6.44,
          -11.05,
          5.42,
          -11.05
        ],
        [
          5.42,
          -11.05,
          5.32,
          -10.95
        ],
        [
          5.32,
          -10.95,
          5.32,
          -9.19
        ],
        [
          5.32,
          -9.19,
          5.42,
          -9.1
        ],
        [
          5.42,
          -9.1,
          6.44,
          -9.1
        ],
        [
          6.44,
          -9.1,
          6.51,
          -9.13
        ],
        [
          6.51,
          -9.13,
          6.8,
          -9.42
        ],
        [
          6.8,
          -9.42,
          6.83,
          -9.48
        ],
        [
          6.83,
          -9.48,
          6.83,
          -10.66
        ],
        [
          6.83,
          -10.66,
          6.8,
          -10.73
        ],
        [
          6.8,
          -10.73,
          6.51,
          -11.02
        ],
        [
          6.51,
          -11.02,
          6.44,
          -11.05
        ]
      ]
    },
// UL_POLYGON --> this one is filled, so it will be generate as an actual polygon
{
      "stroked": false,
      "strokeWidth": 0.01,
      "pathPoints": [
        [
          -11.25,
          -4.31
        ],
        [
          -12.44,
          -4.31
        ],
        [
          -12.44,
          -2.5
        ],
        [
          -11.25,
          -2.5
        ],
        [
          -11.25,
          -4.31
        ]
      ]
    },
```

Currently, GroupedItem are only supported within the 'UL_POLYGONS' layer & recurse one level deep
