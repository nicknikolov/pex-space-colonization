#ifdef VERT

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 normalMatrix;
attribute vec3 position;
attribute vec3 normal;
varying vec3 vTexCoord;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vTexCoord = (normalMatrix * vec4(normal, 1.0)).xyz;
}

#endif

#ifdef FRAG

uniform samplerCube texture;
varying vec3 vTexCoord;

void main() {
  vec3 reflectedDirection = reflect(vec3(0.0, 0.0, 1.0), normalize(vTexCoord));
  reflectedDirection.y *= -1.0;
  gl_FragColor = textureCube(texture, reflectedDirection);
}

#endif
