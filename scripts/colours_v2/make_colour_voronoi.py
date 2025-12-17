import argparse
from PIL import Image, ImageDraw
import numpy as np
from sklearn.cluster import KMeans
from scipy.spatial import Voronoi
from scipy.ndimage import distance_transform_edt
from pathlib import Path

def extract_dominant_colors(image, n_colors=8):
    """Extract n dominant colors from image using K-means"""
    # Get pixels (excluding transparent ones)
    pixels = np.array(image)
    if pixels.shape[2] == 4:  # Has alpha
        mask = pixels[:, :, 3] > 128  # Non-transparent pixels
        rgb_pixels = pixels[mask][:, :3]
    else:
        rgb_pixels = pixels.reshape(-1, 3)
    
    # Cluster colors
    kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
    kmeans.fit(rgb_pixels)
    
    return kmeans.cluster_centers_.astype(int)

def generate_voronoi_points(image, n_points=50):
    """Generate random points weighted by non-transparent pixels"""
    pixels = np.array(image)
    height, width = pixels.shape[:2]
    
    # Get non-transparent pixel coordinates
    if pixels.shape[2] == 4:
        mask = pixels[:, :, 3] > 128
        y_coords, x_coords = np.where(mask)
    else:
        y_coords, x_coords = np.mgrid[0:height, 0:width].reshape(2, -1)
    
    if len(x_coords) == 0:
        # Fallback to uniform grid if no non-transparent pixels
        return np.random.rand(n_points, 2) * [width, height]
    
    # Sample points from non-transparent regions
    indices = np.random.choice(len(x_coords), size=min(n_points, len(x_coords)), replace=False)
    points = np.column_stack([x_coords[indices], y_coords[indices]])
    
    return points

def voronoi_finite_polygons_2d(vor, radius=None):
    """Reconstruct infinite voronoi regions in a 2D diagram to finite regions"""
    if vor.points.shape[1] != 2:
        raise ValueError("Requires 2D input")
    
    new_regions = []
    new_vertices = vor.vertices.tolist()
    
    center = vor.points.mean(axis=0)
    if radius is None:
        radius = np.ptp(vor.points, axis=0).max() * 2
    
    # Construct a map containing all ridges for a given point
    all_ridges = {}
    for (p1, p2), (v1, v2) in zip(vor.ridge_points, vor.ridge_vertices):
        all_ridges.setdefault(p1, []).append((p2, v1, v2))
        all_ridges.setdefault(p2, []).append((p1, v1, v2))
    
    # Reconstruct infinite regions
    for p1, region in enumerate(vor.point_region):
        vertices = vor.regions[region]
        
        if all(v >= 0 for v in vertices):
            # finite region
            new_regions.append(vertices)
            continue
        
        # reconstruct a non-finite region
        ridges = all_ridges[p1]
        new_region = [v for v in vertices if v >= 0]
        
        for p2, v1, v2 in ridges:
            if v2 < 0:
                v1, v2 = v2, v1
            if v1 >= 0:
                # finite ridge: already in the region
                continue
            
            # Compute the missing endpoint of an infinite ridge
            t = vor.points[p2] - vor.points[p1]  # tangent
            t /= np.linalg.norm(t)
            n = np.array([-t[1], t[0]])  # normal
            
            midpoint = vor.points[[p1, p2]].mean(axis=0)
            direction = np.sign(np.dot(midpoint - center, n)) * n
            far_point = vor.vertices[v2] + direction * radius
            
            new_region.append(len(new_vertices))
            new_vertices.append(far_point.tolist())
        
        # sort region counterclockwise
        vs = np.asarray([new_vertices[v] for v in new_region])
        c = vs.mean(axis=0)
        angles = np.arctan2(vs[:, 1] - c[1], vs[:, 0] - c[0])
        new_region = np.array(new_region)[np.argsort(angles)]
        
        new_regions.append(new_region.tolist())
    
    return new_regions, np.asarray(new_vertices)

def create_voronoi_mosaic(image, colors, n_points=50, vague_shape=False, extend=20):
    """Create Voronoi mosaic using dominant colors"""
    width, height = image.size
    pixels = np.array(image)
    
    # Generate Voronoi points
    points = generate_voronoi_points(image, n_points)
    
    # Add boundary points to constrain diagram
    boundary_points = np.array([
        [0, 0], [width, 0], [width, height], [0, height],
        [width/2, 0], [width, height/2], [width/2, height], [0, height/2]
    ])
    all_points = np.vstack([points, boundary_points])
    
    # Compute Voronoi diagram
    vor = Voronoi(all_points)
    regions, vertices = voronoi_finite_polygons_2d(vor)
    
    # Create output image
    mosaic = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mosaic)
    
    # Draw each Voronoi region
    for point_idx, region in enumerate(regions):
        if point_idx >= len(points):  # Skip boundary points
            continue
            
        polygon = [tuple(vertices[i]) for i in region]
        
        # Get color at this point
        x, y = int(points[point_idx][0]), int(points[point_idx][1])
        x = max(0, min(width - 1, x))
        y = max(0, min(height - 1, y))
        
        # Skip if point is transparent
        if pixels.shape[2] == 4 and pixels[y, x, 3] < 128:
            continue
        
        # Get color for this region
        pixel_color = pixels[y, x, :3]
        distances = np.linalg.norm(colors - pixel_color, axis=1)
        region_color = tuple(colors[np.argmin(distances)])
        
        # Draw filled polygon
        draw.polygon(polygon, fill=region_color + (255,), outline=None)
    
    # Apply distance-based masking with irregular boundaries
    if extend > 0:
        mosaic_pixels = np.array(mosaic)
        # Create distance transform from original alpha mask
        original_mask = pixels[:, :, 3] > 128
        # Distance from each pixel to nearest non-transparent pixel
        distances = distance_transform_edt(~original_mask)
        
        # Create irregular boundaries using probabilistic masking
        # Probability decreases with distance from original shape
        probability = np.clip(1.0 - (distances / extend), 0, 1)
        # Add randomness for irregular edges
        random_threshold = np.random.rand(height, width)
        # Keep pixels based on probability (creates irregular boundaries)
        extended_mask = (distances <= extend) & (random_threshold < probability)
        
        mosaic_pixels[:, :, 3] = np.where(extended_mask, mosaic_pixels[:, :, 3], 0)
        mosaic = Image.fromarray(mosaic_pixels)
    
    return mosaic

def process_sprite(input_path, output_path, n_colors=8, n_points=50, vague_shape=False, extend=20):
    """Process a single sprite"""
    image = Image.open(input_path).convert('RGBA')
    colors = extract_dominant_colors(image, n_colors)
    mosaic = create_voronoi_mosaic(image, colors, n_points, vague_shape, extend)
    mosaic.save(output_path)

def main():
    parser = argparse.ArgumentParser(description='Create Voronoi color mosaics from Pokémon sprites')
    parser.add_argument('--input-dir', required=True, help='Input directory with sprites')
    parser.add_argument('--output-dir', required=True, help='Output directory for mosaics')
    parser.add_argument('--colors', type=int, default=8, help='Number of dominant colors (default: 8)')
    parser.add_argument('--points', type=int, default=50, help='Number of Voronoi points (default: 50)')
    parser.add_argument('--extend', type=int, default=20, help='Max pixels to extend beyond original edge (default: 20)')
    parser.add_argument('--vague-shape', action='store_true', help='Create vague shape instead of preserving exact outline')
    
    args = parser.parse_args()
    
    # Create output directory
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    
    # Process all images
    input_dir = Path(args.input_dir)
    for img_file in input_dir.glob('*.png'):
        output_file = Path(args.output_dir) / img_file.name
        print(f'Processing {img_file.name}...')
        try:
            process_sprite(img_file, output_file, args.colors, args.points, args.vague_shape, args.extend)
        except Exception as e:
            print(f'  Error: {e}')
    
    print('Done!')

if __name__ == '__main__':
    main()
