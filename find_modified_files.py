import subprocess
import os
import datetime
import argparse
import shutil
from pathlib import Path
import pathspec

def get_last_commit_date():
    result = subprocess.run(
        ['git', 'log', '-1', '--format=%ct'],
        stdout=subprocess.PIPE,
        text=True,
        check=True
    )
    timestamp = int(result.stdout.strip())
    return datetime.datetime.fromtimestamp(timestamp)

def load_gitignore():
    gitignore_path = Path('.gitignore')
    if gitignore_path.exists():
        with gitignore_path.open() as f:
            patterns = f.read().splitlines()
        return pathspec.PathSpec.from_lines('gitwildmatch', patterns)
    return pathspec.PathSpec([])

def find_modified_files(since_date, ignore_spec):
    modified_files = []
    for root, dirs, files in os.walk('.', topdown=True):
        dirs[:] = [d for d in dirs if d != '.git' and not ignore_spec.match_file(os.path.relpath(os.path.join(root, d)))]

        for file in files:
            rel_path = os.path.relpath(os.path.join(root, file))
            if ignore_spec.match_file(rel_path):
                continue
            try:
                mtime = datetime.datetime.fromtimestamp(os.path.getmtime(rel_path))
                if mtime > since_date:
                    modified_files.append(rel_path)
            except FileNotFoundError:
                continue
    return modified_files

def copy_files(files, destination):
    destination_path = Path(destination)
    if not destination_path.exists():
        destination_path.mkdir(parents=True)

    for file in files:
        src_path = Path(file)
        dest_file_path = destination_path / src_path
        dest_file_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_path, dest_file_path)
        print(f"Copied {file} -> {dest_file_path}")

def main():
    parser = argparse.ArgumentParser(description='Find or copy files modified since last Git commit.')
    parser.add_argument('mode', choices=['list', 'copy'], help='Mode: list or copy')
    parser.add_argument('--destination', help='Destination folder for copy mode')

    args = parser.parse_args()

    lastCommitDate = get_last_commit_date()
    ignore_spec = load_gitignore()
    modified_files = find_modified_files(lastCommitDate, ignore_spec)

    if args.mode == 'list':
        print("Files modified since last commit:")
        for file in modified_files:
            print(f" - {file}")
    elif args.mode == 'copy':
        if not args.destination:
            print("Error: --destination is required in copy mode.")
            return
        copy_files(modified_files, args.destination)

if __name__ == '__main__':
    main()
