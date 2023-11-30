# Raycasting Engine - Javascript Prototype

This implementation of raycasting is an homage to the 1992 id Software classic,
Wolfenstein3D. It adopts the original game's engine approach, relying on
angle-based calculations rather than vector-based methods. This choice, while
less standard and potentially less performant than vector-based approaches
(which avoid costly operations like tangents and cosines), is intentionally
made to remain faithful to the Wolfenstein3D style. It serves as an educational
exercise in understanding the nuances of early 3D game development techniques.

To facilitate rendering and handling input, we use the P5 JS library.

## Running the Prototype

Simply open ```index.html``` in your browser of choice. All necessary code is 
self contained and no extra dependencies are required.

## Editing the Code

All code for the raycaster is included in ```raycast.js```. Comments explain how 
certain calculations are made, but do not give a full picture of the math underpinning
the renderer. For more info, check out the 
[Digital Differential Analyzer algorithm](https://en.wikipedia.org/wiki/Digital_differential_analyzer_(graphics_algorithm)) 
and [Lode's Computer Graphics Tutorial](https://lodev.org/cgtutor/raycasting.html)