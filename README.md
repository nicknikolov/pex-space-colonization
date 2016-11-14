# Space Colonization Algorithm

## DEPRECATED. USE [`space-colonization`](https://github.com/nicknikolov/space-colonization)
## Intro

The space colonization algorithm is used to procedurally generate trees, leafs and generally organic structures. This is an implementation for JavaScript and is decoupled from any drawing code. It simply gives you points. You can draw them with Three.js, Pex, in Ascii or not at all - your choice. 


## How to use
Install:  
`$ npm install pex-space-colonization`  

In your code:  
`var SpaceColon = require('pex-space-colonization')`
`var sc = new SpaceColon(optionsObject)`

Then to iterate the algorithm:  
`var iterObject = sc.iterate()`

## Functions
###iterate()
The iterate object iterates the algorithm which basically means calcute the next step for every branch and eventually kill alive hormones. It returns an object which holds two arrays - buds and hormones.
Both arrays hold objects each having a x, y, z property. The most likley place you would want to call `iterate()` is in your draw loop.

###restart()
Restarts the algorithm. You can call this anytime.

## Options
###type *String*  
The world is 3D so setting it to `'2d'` basically sets all bud and hormone z parameters to 0   
Can be: `'3d'`, `'2d`  
Defaults to: `'2d'`  

###deadZone *Number*
This options specifies the distance at which the bud can (or eat if you like) the hormone.  
Defaults to: `0.1`

###growthStep *Number*
This is the step at which the buds move. Larger number = larger step.  
Defaults to: `0.02`

###splitChance *Number*
This number determines how likely it for a branch to split on every step.  
Defaults: `0.4`

###numHormones *Number*
The number of hormones you start with. This is meaningless if you supply your own points. This is only for demo purpose when you let the algorithm generate hormones for you.
Defaults to: `800`

###startBuds *Number*
The number of buds you start with. This is meaningless if you supply your own points. This is only for demo purpose when you let the algorithm generate random buds for you.  
Defaults to: `1`

###centerRadius *Number*
The radius when the algorithm generates random points. 
This is meaningless if you supply your own points.  
Defaults to: `1`

###budPosArray *Array*
If you supply your own bud points, this is where you pass them. Make sure you fill the array with objects each one having a x, y, z property  
Defaults to: `null`

###hormPosArray *Array*
If you supply your own hormone points, this is where you pass them. Make sure you fill the array with objects each one having a x, y, z property  
Defaults to: `null`

###viewAngle *Number*
The angle at which the bud can look for hormones.   
Defaults to: `50`

###growType *String*
Type of growth. Split means everyime a branch splits into a new one it basically looks like a V. This is for tree-like structures. If its straight, then the original branch doesn't change direction, only the new branch goes sideways (looks like the top part of the letter K). This is used for leaf-like structures. It might be hard to understand this without vizualizing so just run the example and switch between the two.  
Could be: `'split'`, `'straight'`  
Defaults to: `'split'`

###branchAngle *Number*
The angle at which the branch splits. 
Defaults to: `30`

###viewDistance *Number*
The maximum distance at which the bud can look for hormones.
Defaults to: `0.3`

## Papers
http://algorithmicbotany.org/papers/colonization.egwnp2007.html

## Credits
This code was originally based on the 2d implementation from Marcin Ignac (@vorg).  
http://marcinignac.com/experiments/space-colonization/
His contribution to this library has been tremendous.
The algorithm uses Marcin's vector library and the example uses his Pex WebGL library to draw out the result of the algorithm.











