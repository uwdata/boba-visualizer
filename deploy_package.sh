cd client
npm run build

cd ..
rm -rf boba_visualizer.egg-info/
rm -rf build/
rm -rf dist/
python3 setup.py sdist bdist_wheel
