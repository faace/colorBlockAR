AFRAME.createAScene({
    id: 'scene1',
    attributes: {
        embedded: '',
        arjs: '',
    },
    size: 0.2, // change according the map to make the plane is 1*1
    colors: ["#4CC3D9", "#EF2D5E", "#FFC65D", '#ec2def', '#2d3cef', '#1bec65', '#ecbf1b', '#ec1b1b', "#a8aae8", "#afe8a8", '#e8a8a8'], // #f55dff
    createABox: function (el, attr) {
        var attributes = {
            scale: this.size + ' ' + ((this.size * 0.4)) + ' ' + this.size,
            position: + (attr.x * this.size + this.gap) + ' ' + (this.size * 0.2) + ' ' + (attr.z * this.size + this.gap),
            color: attr.color
        };
        if (attr.id) attributes.id = attr.id;
        if (attr.class) attributes.class = attr.class;
        return el.addAnEntity('a-box', attributes);
    },
    createMergeBlocksInfo: function (map, mapLen) {
        var zs = {}, one, has;
        for (var z = 0; z < mapLen; z++) {
            one = {};
            has = false;
            for (var x = 0; x < mapLen; x++) {
                if (map[z][x] == 1) {
                    one[x] = { color: '#ccc' };
                    has = true;
                }
            }
            if (has) zs[z] = one;
        }
        var info = {
            width: this.size,
            height: this.size * 0.4,
            depth: this.size,
            align: 'center bottom center',
            map: { 0: zs }
        }
        return info;
    },
    getMap: function () {
        var map = datas[this.lv];
        if (!map) return alert('Cannot find Level ' + lv + '!');
        var newMap = [];
        for (var i = 0; i < map.length; i++) {
            newMap.push(map[i].slice(0));
        }
        console.log(newMap);
        return newMap;
    },
    creatTheMap: function (scene, attr) {
        var map = this.map = this.getMap();
        var mapLen = this.mapLen = map.length;
        this.size = 1 / mapLen;
        this.gap = - mapLen * this.size * 0.5 + this.size * 0.5;
        var plane = scene.addAnEntity(
            'a-box#plane', { width: mapLen * this.size, height: this.size * 0.01, depth: mapLen * this.size, position: attr.position, rotation: attr.rotation, color: "#bbb0b0" },
        );

        var info = this.createMergeBlocksInfo(map, mapLen);
        plane.addAnEntity(
            'a-mergedvoxels#plane', { src: JSON.stringify(info) },
        );
        var idx = 0, box;
        for (var z = 0; z < mapLen; z++) {
            for (var x = 0; x < mapLen; x++) {
                if (map[z][x] == 2) {
                    box = this.createABox(plane, { id: idx, class: 'clickable', x: x, z: z, color: this.colors[idx] });
                    box.xx = x;
                    box.zz = z;
                    box.idx = 10 + idx;
                    idx++;
                }
            }
        }
        return plane;
    },

    onInit: function (scene) {
        this.lv = localStorage.lv || 0;
        if (this.lv >= datas.length) {
            alert('You have completed all levels!');
            if (confirm('Reset the game?')) {
                localStorage.lv = this.lv = 0;
            } else return;
        }

        var camera = scene.addAnEntity('a-entity', { camera: '' });
        this.cursor = camera.addAnEntity('a-cursor', { fuse: true, fuseTimeout: 500, objects: '.clickable' });

        var marker = scene.addAnEntity('a-marker', { preset: 'hiro' });
        this.creatTheMap(marker, { position: '0 0 0', rotation: '0 0 0' });
        this.clickNum = AFRAME.$$('.clickable').length;
        this.text = marker.addAnEntity('a-text', { value: "", position: '0 0.5 0', scale: '0.5 0.5 0.5', color: '#000', rotation: '-90 0 0', align: 'center' })

    },
    onLoaded: function (scene) { // after the scene is loaded.
        this.intersectedEls = this.cursor.components.raycaster.intersectedEls;

        document.addEventListener('mousedown', this.mouseDown.bind(this));
        document.addEventListener('click', this.mouseDown.bind(this));
    },
    showResult: function (isPass) {
        var text = isPass ? 'Pass!\n\nNext Level\n' : 'Again\n';
        var ts = Date.now() + 3000; // after 3 second
        var id = setInterval(function () {
            var now = Date.now();
            if (now > ts) {
                clearInterval(id);
                AFRAME.loadScene('scene1'); // reload
                return;
            }
            var sec = Math.ceil((ts - now) * 0.001);
            this.text.setAttribute('value', text + sec);
        }.bind(this), 200);
    },
    mouseDown: function () {
        var target = this.intersectedEls[0];
        if (target && !target.handled) {
            console.log('yes');
            target.handled = true;
            this.handleMap(target);
            if (--this.clickNum < 1) {
                setTimeout(function () {
                    // check where you win.
                    for (var z = 0; z < this.mapLen; z++) {
                        for (var x = 0; x < this.mapLen; x++) {
                            if (this.map[z][x] < 1) {
                                return this.showResult(false);
                            }
                        }
                    }
                    localStorage.lv = ++this.lv;
                    this.showResult(true);
                }.bind(this), 500);
            }
        }
    },
    isEmptyLine: function (z, x1, x2) {
        for (var x = x1; x <= x2; x++) {
            if (this.map[z][x]) return false;
        }
        return true;
    },
    handleMap: function (box) {
        // find the rect
        var leftX = box.xx, rightX = box.xx;
        var topZ = box.zz, bottomZ = box.zz;
        // first -
        while (this.map[box.zz][leftX - 1] < 1) leftX--;
        while (this.map[box.zz][rightX + 1] < 1) rightX++;
        // then |
        while (this.isEmptyLine(topZ - 1, leftX, rightX)) topZ--;
        while (this.isEmptyLine(bottomZ + 1, leftX, rightX)) bottomZ++;

        for (var z = topZ; z <= bottomZ; z++) {
            for (var x = leftX; x <= rightX; x++) {
                if (!this.map[z][x]) this.map[z][x] = box.idx;
            }
        }

        var scaleX = (rightX - leftX + 1) * this.size;
        var scaleZ = (bottomZ - topZ + 1) * this.size;
        var x = leftX * this.size + this.gap + (rightX - leftX) * 0.5 * this.size;
        var z = topZ * this.size + this.gap + (bottomZ - topZ) * 0.5 * this.size;

        box.object3D.position.x = x;
        box.object3D.position.z = z;
        box.object3D.scale.x = scaleX;
        box.object3D.scale.z = scaleZ;
    },
    onRemove: function () {
        document.removeEventListener('mousedown', this.mouseDown.bind(this));
        document.removeEventListener('click', this.mouseDown.bind(this));
    }
});
