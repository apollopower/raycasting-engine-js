/* 
This implementation of raycasting is an homage to the 1992 id Software classic,
Wolfenstein3D. It adopts the original game's engine approach, relying on
angle-based calculations rather than vector-based methods. This choice, while
less standard and potentially less performant than vector-based approaches
(which avoid costly operations like tangents and cosines), is intentionally
made to remain faithful to the Wolfenstein3D style. It serves as an educational
exercise in understanding the nuances of early 3D game development techniques.

- Jonas Erthal, November 2023
*/


const TILE_SIZE = 64;
const MAP_NUM_ROWS = 11;
const MAP_NUM_COLS = 15;

const WINDOW_WIDTH = MAP_NUM_COLS * TILE_SIZE;
const WINDOW_HEIGHT = MAP_NUM_ROWS * TILE_SIZE;

const FOV_ANGLE = 60 * (Math.PI / 180); // 60deg in radians

const WALL_STRIP_WIDTH = 1;
const NUM_RAYS = WINDOW_WIDTH / WALL_STRIP_WIDTH;

const MINIMAP_SCALE_FACTOR = 0.2;

const VISIBILITY_RANGE_PIXELS = TILE_SIZE * 15;
const WALL_COLOR_HEX = "#E1E1E1";
const BACKGROUND_COLOR_HEX = "#212121";

class Map {
    constructor() {
        this.grid = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ];
    }

    hasWallAt(x, y) {
        if (x < 0 || x > WINDOW_WIDTH || y < 0 || y > WINDOW_HEIGHT) {
            return true;
        }

        var tileX = Math.floor(x / TILE_SIZE);
        var tileY = Math.floor(y / TILE_SIZE);
        return this.grid[tileY][tileX] == 1;
    }

    render() {
        for (var i = 0; i < MAP_NUM_ROWS; i++) {
            for (var j = 0; j < MAP_NUM_COLS; j++) {
                var tileX = j * TILE_SIZE; // j is the column here, which represents our x values
                var tileY = i * TILE_SIZE;
                var tileColor = this.grid[i][j] == 1 ? '#222' : '#fff';
                stroke('#222');
                fill(tileColor);
                rect(
                    tileX * MINIMAP_SCALE_FACTOR,
                    tileY * MINIMAP_SCALE_FACTOR,
                    TILE_SIZE * MINIMAP_SCALE_FACTOR,
                    TILE_SIZE * MINIMAP_SCALE_FACTOR
                );
            }
        }
    }
}

class Player {
    constructor() {
        this.x = WINDOW_WIDTH / 2;
        this.y = WINDOW_HEIGHT / 2;
        this.radius = 6;
        this.turnDirection = 0; // -1 if left, 1 if right
        this.walkDirection = 0; // -1 if back, 1 if forward
        this.rotationAngle = Math.PI / 2; // 90deg, represented in radians
        this.moveSpeed = 2.0;
        this.rotationSpeed = 2.0 * (Math.PI / 180); // 2 degrees per frame, converted to radians
    }

    update() {
        this.rotationAngle += this.turnDirection * this.rotationSpeed;

        // If not walking, we do not need to calculate movement/possible collisions
        if (this.walkDirection == 0) {
            return;
        }

        // Get the magnitude of our movement
        var moveStep = this.walkDirection * this.moveSpeed;

        // We can calculate the actual vectors of our xy movement given our rotation angle
        // (refer to trig methods for cos and sin to get absolute x and y values based on angle)
        var newX = this.x + Math.cos(this.rotationAngle) * moveStep;
        var newY = this.y + Math.sin(this.rotationAngle) * moveStep;

        // COLLISION CHECK: Based on the new xy coordinates (which represent absolute "pixel values" on the screen)
        // we can find the corresponding tile's index in our map's grid by dividing said value by the size of
        // tiles (a const). We round down to an int so a proper index can be accessed by our grid.
        var tileX = Math.floor(newX / TILE_SIZE);
        var tileY = Math.floor(newY / TILE_SIZE);

        // Given our map's grid and the proposed tile's coordinates we are trying to move to, we check
        // if that tile is a wall (1) or not (0). If not, we update our xy positions
        if (gameMap.grid[tileY][tileX] != 1) {
            this.x = newX;
            this.y = newY;
        }
    }

    render() {
        noStroke();

        fill("red");
        circle(
            this.x * MINIMAP_SCALE_FACTOR,
            this.y * MINIMAP_SCALE_FACTOR,
            this.radius * MINIMAP_SCALE_FACTOR
        );
    }
}

class Ray {
    constructor(rayAngle) {
        this.rayAngle = normalizeAngle(rayAngle);
        this.wallHitX = 0;
        this.wallHitY = 0;
        this.distance = 0;
        this.wasHitVertical = false;

        this.isRayFacingDown = this.rayAngle > 0 && this.rayAngle < Math.PI;
        this.isRayFacingUp = !this.isRayFacingDown;
        // this might look weird, but remember we are calculating radians
        this.isRayFacingRight = this.rayAngle < 0.5 * Math.PI || this.rayAngle > 1.5 * Math.PI;
        this.isRayFacingLeft = !this.isRayFacingRight;
    }

    cast(columnId) {
        var xIntercept, yIntercept;
        var xStep, yStep;

        //////
        // HORIZONTAL RAY-INTERSECTION
        /////
        var foundHorizontalWallHit = false;
        var horizontalWallHitX = 0;
        var horizontalWallHitY = 0;

        // Find xy coords of the closest horizontal intersection. We get the proper intersection
        // based on the direction the angle is facing, as it might be +1/-1 the tile size
        yIntercept = Math.floor(player.y / TILE_SIZE) * TILE_SIZE;
        yIntercept += this.isRayFacingDown ? TILE_SIZE : 0;
        xIntercept = player.x + (yIntercept - player.y) / Math.tan(this.rayAngle);

        // Get the increment for xStep & yStep (also taking into consideration ray direction)
        yStep = TILE_SIZE;
        yStep *= this.isRayFacingUp ? -1 : 1;
        xStep = TILE_SIZE / Math.tan(this.rayAngle);
        xStep *= (this.isRayFacingLeft && xStep > 0) ? -1 : 1;
        xStep *= (this.isRayFacingRight && xStep < 0) ? -1 : 1;

        var nextHorizontalTouchX = xIntercept;
        var nextHorizontalTouchY = yIntercept;
        // Increment xStep and yStep until we find a wall
        while (nextHorizontalTouchX >= 0 && nextHorizontalTouchX <= WINDOW_WIDTH && 
            nextHorizontalTouchY >= 0 && nextHorizontalTouchY <= WINDOW_HEIGHT) {
            // to get the tile we are 'facing', we need to get a pixel coordinate that falls within that tile
            // if the ray is facing up, it means that the y pixel value needs to be shifted up from the edge
            // to calculate the intended tile coordinate, and not the tile the ray is coming from
            let yCheck = this.isRayFacingUp ? nextHorizontalTouchY - 1 : nextHorizontalTouchY;
            if (gameMap.hasWallAt(nextHorizontalTouchX, yCheck)) {
                foundHorizontalWallHit = true;
                horizontalWallHitX = nextHorizontalTouchX;
                horizontalWallHitY = nextHorizontalTouchY;
                break;
            } else {
                nextHorizontalTouchX += xStep;
                nextHorizontalTouchY += yStep;
            }
        }

        //////
        // VERTICAL RAY-INTERSECTION
        /////
        var foundVerticalWallHit = false;
        var verticalWallHitX = 0;
        var verticalWallHitY = 0;

        // Find xy coords of the closest VERTICAL intersection. We get the proper intersection
        // based on the direction the angle is facing, as it might be +1/-1 the tile size
        xIntercept = Math.floor(player.x / TILE_SIZE) * TILE_SIZE;
        xIntercept += this.isRayFacingRight ? TILE_SIZE : 0;
        // Remember, that for vertical intersection, the yIntercept is calculated by multiplying the tang
        // (do the algebra, see its the inverse)
        yIntercept = player.y + (xIntercept - player.x) * Math.tan(this.rayAngle);

        // Get the increment for xStep & yStep (also taking into consideration ray direction)
        xStep = TILE_SIZE;
        xStep *= this.isRayFacingLeft ? -1 : 1;

        yStep = TILE_SIZE * Math.tan(this.rayAngle);
        yStep *= (this.isRayFacingUp && yStep > 0) ? -1 : 1;
        yStep *= (this.isRayFacingDown && yStep < 0) ? -1 : 1;

        var nextVerticalTouchX = xIntercept;
        var nextVerticalTouchY = yIntercept;

        // Increment xStep and yStep until we find a wall
        while (nextVerticalTouchX >= 0 && nextVerticalTouchX <= WINDOW_WIDTH && nextVerticalTouchY >= 0 && nextVerticalTouchY <= WINDOW_HEIGHT) {
            // to get the tile we are 'facing', we need to get a pixel coordinate that falls within that tile
            // if the ray is facing left, it means that the x pixel value needs to be shifted left from the edge
            // to calculate the intended tile coordinate, and not the tile the ray is coming from
            let xCheck = this.isRayFacingLeft ? nextVerticalTouchX - 1 : nextVerticalTouchX;
            if (gameMap.hasWallAt(xCheck, nextVerticalTouchY)) {
                foundVerticalWallHit = true;
                verticalWallHitX = nextVerticalTouchX;
                verticalWallHitY = nextVerticalTouchY;
                break;
            } else {
                nextVerticalTouchX += xStep;
                nextVerticalTouchY += yStep;
            }
        }

        //////
        // GET DISTANCES FROM HIT DISTANCES & GET SMALLEST VALUE
        /////
        var horizontalHitDistance = foundHorizontalWallHit
            ? distanceBetweenPoints(player.x, player.y, horizontalWallHitX, horizontalWallHitY)
            : Number.MAX_VALUE;
        var verticalHitDistance = foundVerticalWallHit
            ? distanceBetweenPoints(player.x, player.y, verticalWallHitX, verticalWallHitY)
            : Number.MAX_VALUE;
        
        // Remember, we only want the smallest (aka. the closest value to the player)
        this.wallHitX = (horizontalHitDistance < verticalHitDistance) ? horizontalWallHitX : verticalWallHitX;
        this.wallHitY = (horizontalHitDistance < verticalHitDistance) ? horizontalWallHitY : verticalWallHitY;
        this.distance = (horizontalHitDistance < verticalHitDistance) ? horizontalHitDistance : verticalHitDistance;
        this.wasHitVertical = verticalHitDistance < horizontalHitDistance;
    }

    render() {
        stroke("rgba(0, 0, 255, 0.3)");
        line(
            player.x * MINIMAP_SCALE_FACTOR,
            player.y * MINIMAP_SCALE_FACTOR,
            this.wallHitX * MINIMAP_SCALE_FACTOR,
            this.wallHitY * MINIMAP_SCALE_FACTOR
        );
    }
}

var gameMap = new Map();
var player = new Player();
var rays = [];

function keyPressed() {
    if (keyCode == UP_ARROW) {
        player.walkDirection = 1;
    } else if (keyCode == DOWN_ARROW) {
        player.walkDirection = -1;
    } else if (keyCode == LEFT_ARROW) {
        player.turnDirection = -1;
    } else if (keyCode == RIGHT_ARROW) {
        player.turnDirection = 1;
    }
}

function keyReleased() {
    if (keyCode == UP_ARROW) {
        player.walkDirection = 0;
    } else if (keyCode == DOWN_ARROW) {
        player.walkDirection = 0;
    } else if (keyCode == LEFT_ARROW) {
        player.turnDirection = 0;
    } else if (keyCode == RIGHT_ARROW) {
        player.turnDirection = 0;
    }
}

function castAllRays() {
    var columnId = 0;

    // Get first ray by sub half of the FOV
    var rayAngle = player.rotationAngle - (FOV_ANGLE / 2);

    rays = [];

    // loop all columns to cast rays
    for (var i = 0; i < NUM_RAYS; i++) {
        var ray = new Ray(rayAngle);
        ray.cast(columnId);
        rays.push(ray);

        rayAngle += FOV_ANGLE / NUM_RAYS;

        columnId++;
    }
}

function renderWallProjections() {
    for (var i = 0; i < NUM_RAYS; i++) {
        var ray = rays[i];

        // for the ray distance, we need to correct for distortion
        // where rays on the edge of the cast are longer than rays
        // at the center.
        var perpendicularRayDistance = ray.distance * Math.cos(ray.rayAngle - player.rotationAngle);
        
        var distanceProjPlane = (WINDOW_WIDTH / 2) / Math.tan(FOV_ANGLE / 2);
        var wallStripHeight = (TILE_SIZE / perpendicularRayDistance) * distanceProjPlane;

        fill(getWallColor(perpendicularRayDistance));
        noStroke();
        rect(
            i * WALL_STRIP_WIDTH,
            (WINDOW_HEIGHT / 2) - (wallStripHeight / 2),
            WALL_STRIP_WIDTH,
            wallStripHeight
        );
    }
}

function getWallColor(rayDistance) {
    var scalar = Math.min(Math.max(rayDistance, TILE_SIZE), VISIBILITY_RANGE_PIXELS);

    // Convert hex to RGB
    function hexToRgb(hex) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }

    // Convert RGB to hex
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Interpolate between two colors
    function interpolateColors(color1, color2, factor) {
        return {
            r: Math.round(color1.r + factor * (color2.r - color1.r)),
            g: Math.round(color1.g + factor * (color2.g - color1.g)),
            b: Math.round(color1.b + factor * (color2.b - color1.b))
        };
    }

    var startColor = hexToRgb(WALL_COLOR_HEX);
    var endColor = hexToRgb(BACKGROUND_COLOR_HEX); 
    var factor = scalar / VISIBILITY_RANGE_PIXELS;

    var resultColor = interpolateColors(startColor, endColor, factor);
    return rgbToHex(resultColor.r, resultColor.g, resultColor.b);
}

function normalizeAngle(angle) {
    angle = angle % (2 * Math.PI);
    if (angle < 0) {
        angle = (2 * Math.PI) + angle;
    }
    return angle;
}

function distanceBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function setup() {
    createCanvas(WINDOW_WIDTH, WINDOW_HEIGHT);
}

function update() {
    player.update();
    castAllRays();
}

function draw() {
    clear("#212121");
    update();

    renderWallProjections();

    gameMap.render();
    for (ray of rays) {
        ray.render();
    }
    player.render();
}
