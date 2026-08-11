varying vec2 vUv;
uniform float time;
uniform vec4 resolution;

void main() {
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center);
    
    // Create multiple ripple waves
    float wave1 = sin(dist * 20.0 - time * 3.0);
    float wave2 = sin(dist * 30.0 - time * 4.0) * 0.5;
    
    // Combine waves
    float ripple = wave1 + wave2;
    
    // Create smooth falloff from center
    float alpha = smoothstep(1.0, 0.0, dist) * 0.5;
    
    // Add some color variation
    vec3 color = vec3(0.9, 0.95, 1.0); // Slightly blue-tinted white
    
    // Final color with transparency
    gl_FragColor = vec4(color, alpha * (ripple * 0.5 + 0.5));
}
