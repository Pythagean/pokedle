import argparse
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from sklearn.cluster import KMeans
from scipy.ndimage import binary_dilation
import random
import os
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

def get_hexagon_vertices(center_x, center_y, size):
    """Generate vertices for a flat-top hexagon"""
    vertices = []
    for i in range(6):
        # Rotate 90 degrees (add π/2) to the base angle
        angle = np.pi / 3 * i + np.pi / 6 + np.pi / 2
        x = center_x + size * np.cos(angle)
        y = center_y + size * np.sin(angle)
        vertices.append((x, y))
    return vertices

def create_mosaic(image, colors, cell_size=8, vague_shape=False, shuffle_hexagons=False):
    """Create mosaic using dominant colors with hexagonal cells"""
    width, height = image.size
    mosaic = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(mosaic)
    pixels = np.array(image)
    
    # Hexagon dimensions (flat-top orientation)
    hex_radius = cell_size / 2
    # For flat-top: width = 2 * radius, height = sqrt(3) * radius
    hex_width = hex_radius * 2
    hex_height = hex_radius * np.sqrt(3)
    
    # Proper tessellation spacing for flat-top hexagons
    horiz_spacing = hex_width * 0.75  # 3/4 of width between column centers
    vert_spacing = hex_height  # Full height between row centers
    
    # Collect hexagon positions and colors
    hexagon_data = []  # List of (center_x, center_y, color)
    
    # Process in hexagonal grid
    col = 0
    x = 0
    while x < width + hex_width:
        # Offset every other column
        y_offset = (hex_height / 2) if col % 2 == 1 else 0
        y = y_offset
        
        while y < height + hex_height:
            center_x = x
            center_y = y
            
            # Sample color from hexagon area
            sample_x = int(center_x)
            sample_y = int(center_y)
            
            # Make sure we're within bounds for sampling
            if sample_x < 0 or sample_x >= width or sample_y < 0 or sample_y >= height:
                y += vert_spacing
                continue
            
            sample_x = max(0, min(width - 1, sample_x))
            sample_y = max(0, min(height - 1, sample_y))
            
            # Check if this area is mostly transparent
            sample_size = max(1, int(hex_radius))
            y_start = max(0, sample_y - sample_size)
            y_end = min(height, sample_y + sample_size)
            x_start = max(0, sample_x - sample_size)
            x_end = min(width, sample_x + sample_size)
            
            sample_region = pixels[y_start:y_end, x_start:x_end]
            
            if sample_region.shape[2] == 4:
                avg_alpha = np.mean(sample_region[:, :, 3])
                if avg_alpha < 128:
                    y += vert_spacing
                    continue
                    
                mask = sample_region[:, :, 3] > 128
                if not mask.any():
                    y += vert_spacing
                    continue
                avg_color = np.mean(sample_region[mask][:, :3], axis=0)
            else:
                avg_color = np.mean(sample_region[:, :, :3], axis=(0, 1))
            
            # Find nearest dominant color
            distances = np.linalg.norm(colors - avg_color, axis=1)
            nearest_color = tuple(colors[np.argmin(distances)])
            
            # Store hexagon data
            hexagon_data.append((center_x, center_y, nearest_color))
            
            y += vert_spacing
        
        x += horiz_spacing
        col += 1
    
    # Shuffle colors if requested
    if shuffle_hexagons:
        # Extract just the colors
        hexagon_colors = [h[2] for h in hexagon_data]
        # Shuffle the colors
        random.shuffle(hexagon_colors)
        # Reassign shuffled colors back
        hexagon_data = [(h[0], h[1], hexagon_colors[i]) for i, h in enumerate(hexagon_data)]
    
    # Draw all hexagons
    for center_x, center_y, hex_color in hexagon_data:
        vertices = get_hexagon_vertices(center_x, center_y, hex_radius)
        draw.polygon(vertices, fill=hex_color + (255,), outline=None)
    
    # Apply alpha mask if not vague shape
    if not vague_shape:
        mosaic_pixels = np.array(mosaic)
        # Dilate alpha mask slightly to prevent cutting off hexagons at edges
        alpha_mask = pixels[:, :, 3] > 128
        # Dilate by a few pixels (adjust iterations for more/less extension)
        dilated_mask = binary_dilation(alpha_mask, iterations=3)
        mosaic_pixels[:, :, 3] = np.where(dilated_mask, mosaic_pixels[:, :, 3], 0)
        mosaic = Image.fromarray(mosaic_pixels)
    
    return mosaic

def process_sprite(input_path, output_path, n_colors=8, cell_size=8, vague_shape=False, padding=0, blur=0, shuffle_hexagons=False):
    """Process a single sprite"""
    image = Image.open(input_path).convert('RGBA')
    
    # Add padding if requested
    if padding > 0:
        old_width, old_height = image.size
        new_width = old_width + 2 * padding
        new_height = old_height + 2 * padding
        # Create new image with transparent background
        padded = Image.new('RGBA', (new_width, new_height), (0, 0, 0, 0))
        # Paste original image in center
        padded.paste(image, (padding, padding))
        image = padded
    
    # Resize to 700x700 using high-quality resampling
    image = image.resize((700, 700), Image.Resampling.LANCZOS)
    
    # Apply blur if requested
    if blur > 0:
        image = image.filter(ImageFilter.GaussianBlur(radius=blur))
    
    colors = extract_dominant_colors(image, n_colors)
    mosaic = create_mosaic(image, colors, cell_size, vague_shape, shuffle_hexagons)
    mosaic.save(output_path)

def main():
    parser = argparse.ArgumentParser(description='Create color mosaics from Pokémon sprites')
    parser.add_argument('--input-dir', required=True, help='Input directory with sprites')
    parser.add_argument('--output-dir', required=True, help='Output directory for mosaics')
    parser.add_argument('--colors', type=int, default=8, help='Number of dominant colors (default: 8)')
    parser.add_argument('--cell-size', type=int, default=8, help='Mosaic cell size in pixels (default: 8)')
    parser.add_argument('--padding', type=int, default=0, help='Transparent padding to add around image before processing (default: 0)')
    parser.add_argument('--blur', type=float, default=0, help='Gaussian blur radius to apply before processing (default: 0)')
    parser.add_argument('--shuffle-hexagons', action='store_true', help='Randomly shuffle hexagon positions after processing')
    parser.add_argument('--vague-shape', action='store_true', help='Create vague blocky shape instead of preserving exact outline')
    
    args = parser.parse_args()
    
    # Create output directory
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)
    
    # Process all images
    input_dir = Path(args.input_dir)
    for img_file in input_dir.glob('*.png'):
        output_file = Path(args.output_dir) / img_file.name
        print(f'Processing {img_file.name}...')
        process_sprite(img_file, output_file, args.colors, args.cell_size, args.vague_shape, args.padding, args.blur, args.shuffle_hexagons)
    
    print('Done!')

if __name__ == '__main__':
    main()