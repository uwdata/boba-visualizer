rm -rf dist

# create dist
python setup.py sdist bdist_wheel
rm -rf build
cd dist
mkdir demo
tar -xf boba-*.tar.gz -C demo --strip-components 1

# copy data
cp -R ~/code/multiverse-spec/example/hurricane/prototype/server ./
mv server data
mv data demo/

# create init.sh
text="virtualenv -p python3 env
source env/bin/activate
pip install -e .
boba-server -i data/"
echo "$text" > demo/init.sh

echo "Done!"
echo "Demo is in dist/demo/"
echo "Run 'sh init.sh' in the demo folder to start"
