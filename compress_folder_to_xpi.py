import os
import shutil
import datetime
import re

def custom_ignore(path, names):
    return [name for name in names if any(re.match(pattern, name) for pattern in ignore_patterns)]

# Specify the values here
source_folder = r"./"
compression_format = "zip"  # Options: "zip", "tar", "gztar", "bztar", "xztar"
custom_extension = "xpi"  # Leave empty if you don't want to change the extension
custom_filename = "copy-tab-urls"  # Leave empty to use the parent folder name
ignore_patterns = [r'.*\.py', r'\.git', r'.*\.zip', r'.*\.backup', r'.*\.xpi']  # Add regex patterns to ignore

# Get the current timestamp
timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

# Get the parent folder name
parent_folder_name = os.path.basename(os.path.dirname(source_folder))

# Determine the filename
if custom_filename:
    filename = custom_filename
else:
    filename = parent_folder_name

# Create the full filename with timestamp
full_filename = f"{filename}_{timestamp}"

# Create the full output path
output_path = os.path.join(os.path.dirname(source_folder), full_filename)

# Create a temporary directory for filtered content
temp_dir = os.path.join(os.path.dirname(source_folder), f"temp_{timestamp}")
shutil.copytree(source_folder, temp_dir, ignore=custom_ignore)

# Compress the filtered folder
shutil.make_archive(output_path, compression_format, temp_dir)

# Remove the temporary directory
shutil.rmtree(temp_dir)

# Rename the file if a custom extension is specified
if custom_extension:
    new_filename = f"{full_filename}.{custom_extension}"
    new_path = os.path.join(os.path.dirname(source_folder), new_filename)
    os.rename(f"{output_path}.{compression_format}", new_path)
    output_path = new_path
else:
    output_path += f".{compression_format}"

print(f"Folder compressed successfully: {output_path}")
