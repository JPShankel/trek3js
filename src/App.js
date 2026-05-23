import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './App.css';

const GALAXY_SIZE = 8;
const SECTOR_SIZE = 8;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function createEmptySectorGrid() {
  return Array.from({ length: SECTOR_SIZE }, () =>
    Array.from({ length: SECTOR_SIZE }, () => 'empty')
  );
}

function pickOpenSector(sectors) {
  let row = randomInt(SECTOR_SIZE);
  let col = randomInt(SECTOR_SIZE);

  while (sectors[row][col] !== 'empty') {
    row = randomInt(SECTOR_SIZE);
    col = randomInt(SECTOR_SIZE);
  }

  return { row, col };
}

function generateQuadrant() {
  const sectors = createEmptySectorGrid();
  const stars = 1 + randomInt(5);
  const enemies = randomInt(4);
  const bases = Math.random() > 0.82 ? 1 : 0;

  for (let index = 0; index < stars; index += 1) {
    const position = pickOpenSector(sectors);
    sectors[position.row][position.col] = 'star';
  }

  for (let index = 0; index < enemies; index += 1) {
    const position = pickOpenSector(sectors);
    sectors[position.row][position.col] = 'enemy';
  }

  for (let index = 0; index < bases; index += 1) {
    const position = pickOpenSector(sectors);
    sectors[position.row][position.col] = 'base';
  }

  return {
    sectors,
    planets: stars,
    enemies,
    bases,
  };
}

function generateGalaxy() {
  return Array.from({ length: GALAXY_SIZE }, () =>
    Array.from({ length: GALAXY_SIZE }, () => generateQuadrant())
  );
}

function cloneGalaxy(galaxy) {
  return galaxy.map((row) =>
    row.map((quadrant) => ({
      ...quadrant,
      sectors: quadrant.sectors.map((sectorRow) => [...sectorRow]),
    }))
  );
}

function placeShip(galaxy, quadrant, sector) {
  const nextGalaxy = cloneGalaxy(galaxy);
  nextGalaxy[quadrant.row][quadrant.col].sectors[sector.row][sector.col] = 'ship';
  return nextGalaxy;
}

function initializeGame() {
  const galaxy = generateGalaxy();
  const quadrant = {
    row: randomInt(GALAXY_SIZE),
    col: randomInt(GALAXY_SIZE),
  };
  const sector = pickOpenSector(galaxy[quadrant.row][quadrant.col].sectors);

  return {
    galaxy: placeShip(galaxy, quadrant, sector),
    shipQuadrant: quadrant,
    shipSector: sector,
    stardate: 3200 + randomInt(400),
    commandLog: 'Bridge online. Short range sensors and long range scan ready.',
  };
}

function moveShip(game, rowDelta, colDelta) {
  const sectorRow = game.shipSector.row + rowDelta;
  const sectorCol = game.shipSector.col + colDelta;

  if (
    sectorRow < 0 ||
    sectorRow >= SECTOR_SIZE ||
    sectorCol < 0 ||
    sectorCol >= SECTOR_SIZE
  ) {
    return {
      ...game,
      commandLog: 'Impulse course blocked. Use warp controls to cross quadrant boundaries.',
    };
  }

  const currentQuadrant = game.galaxy[game.shipQuadrant.row][game.shipQuadrant.col];
  const destination = currentQuadrant.sectors[sectorRow][sectorCol];

  if (destination !== 'empty') {
    return {
      ...game,
      commandLog: `Sector ${sectorRow + 1}-${sectorCol + 1} occupied by ${destination}.`,
    };
  }

  const nextGalaxy = cloneGalaxy(game.galaxy);
  nextGalaxy[game.shipQuadrant.row][game.shipQuadrant.col].sectors[game.shipSector.row][
    game.shipSector.col
  ] = 'empty';
  nextGalaxy[game.shipQuadrant.row][game.shipQuadrant.col].sectors[sectorRow][sectorCol] = 'ship';

  return {
    ...game,
    galaxy: nextGalaxy,
    shipSector: { row: sectorRow, col: sectorCol },
    stardate: game.stardate + 1,
    commandLog: `Impulse complete. Ship now in sector ${sectorRow + 1}-${sectorCol + 1}.`,
  };
}

function warpShip(game, rowDelta, colDelta) {
  const quadrantRow = game.shipQuadrant.row + rowDelta;
  const quadrantCol = game.shipQuadrant.col + colDelta;

  if (
    quadrantRow < 0 ||
    quadrantRow >= GALAXY_SIZE ||
    quadrantCol < 0 ||
    quadrantCol >= GALAXY_SIZE
  ) {
    return {
      ...game,
      commandLog: 'Warp route exceeds the galaxy boundary.',
    };
  }

  const nextGalaxy = cloneGalaxy(game.galaxy);
  nextGalaxy[game.shipQuadrant.row][game.shipQuadrant.col].sectors[game.shipSector.row][
    game.shipSector.col
  ] = 'empty';

  const destinationQuadrant = nextGalaxy[quadrantRow][quadrantCol];
  const destinationSector = pickOpenSector(destinationQuadrant.sectors);
  destinationQuadrant.sectors[destinationSector.row][destinationSector.col] = 'ship';

  return {
    ...game,
    galaxy: nextGalaxy,
    shipQuadrant: { row: quadrantRow, col: quadrantCol },
    shipSector: destinationSector,
    stardate: game.stardate + 5,
    commandLog: `Warp complete. Entered quadrant ${quadrantRow + 1}-${quadrantCol + 1}.`,
  };
}

function createLongRangeCells(galaxy, shipQuadrant) {
  return galaxy.flatMap((row, rowIndex) =>
    row.map((quadrant, colIndex) => ({
      key: `${rowIndex}:${colIndex}`,
      code: `${quadrant.planets}${quadrant.enemies}${quadrant.bases}`,
      label: `${rowIndex + 1}-${colIndex + 1}`,
      active: rowIndex === shipQuadrant.row && colIndex === shipQuadrant.col,
    }))
  );
}

function getQuadrantObjects(quadrant) {
  const objects = [];

  quadrant.sectors.forEach((row, rowIndex) => {
    row.forEach((type, colIndex) => {
      if (type !== 'empty') {
        objects.push({ type, row: rowIndex, col: colIndex });
      }
    });
  });

  return objects;
}

function TacticalScene({ quadrant }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount || process.env.NODE_ENV === 'test') {
      return undefined;
    }

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050816');
    scene.fog = new THREE.Fog('#050816', 24, 58);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 18, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight('#8aa0ff', 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.5);
    keyLight.position.set(8, 12, 6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight('#49dcb1', 18, 35, 2);
    rimLight.position.set(-8, 7, -6);
    scene.add(rimLight);

    const floorMaterial = new THREE.MeshPhongMaterial({
      color: '#0f1a2f',
      emissive: '#081120',
      shininess: 70,
      specular: '#9de7d7',
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.9;
    scene.add(floor);

    const grid = new THREE.GridHelper(16, 8, '#4ae1ff', '#17365d');
    grid.position.y = -0.88;
    scene.add(grid);

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(16, 0.15, 16)),
      new THREE.LineBasicMaterial({ color: '#6fe7ff' })
    );
    frame.position.y = -0.8;
    scene.add(frame);

    const animatedMeshes = [];
    const objects = getQuadrantObjects(quadrant);

    objects.forEach((object) => {
      const x = (object.col - 3.5) * 2;
      const z = (object.row - 3.5) * 2;
      let mesh;

      if (object.type === 'star') {
        mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.45, 0),
          new THREE.MeshStandardMaterial({
            color: '#ffd166',
            emissive: '#ffb703',
            emissiveIntensity: 0.9,
            metalness: 0.15,
            roughness: 0.35,
          })
        );
        mesh.position.set(x, 0.45, z);
      } else if (object.type === 'enemy') {
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.58, 0),
          new THREE.MeshStandardMaterial({
            color: '#ff5d73',
            emissive: '#961d37',
            emissiveIntensity: 0.55,
            metalness: 0.5,
            roughness: 0.25,
          })
        );
        mesh.position.set(x, 0.7, z);
      } else if (object.type === 'base') {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.55, 1.1, 6),
          new THREE.MeshStandardMaterial({
            color: '#7ae582',
            emissive: '#23552a',
            emissiveIntensity: 0.35,
            metalness: 0.3,
            roughness: 0.45,
          })
        );
        mesh.position.set(x, 0.1, z);
      } else {
        mesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.55, 1.35, 4),
          new THREE.MeshStandardMaterial({
            color: '#74c0fc',
            emissive: '#163d69',
            emissiveIntensity: 0.65,
            metalness: 0.45,
            roughness: 0.2,
          })
        );
        mesh.position.set(x, 0.1, z);
        mesh.rotation.x = Math.PI;
      }

      scene.add(mesh);
      animatedMeshes.push({ mesh, type: object.type });
    });

    let frameId = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();

      animatedMeshes.forEach(({ mesh, type }) => {
        mesh.rotation.y += type === 'enemy' ? 0.025 : 0.01;

        if (type === 'star') {
          mesh.position.y = 0.45 + Math.sin(elapsed * 2 + mesh.position.x) * 0.08;
        }

        if (type === 'ship') {
          mesh.position.y = 0.1 + Math.sin(elapsed * 2.4) * 0.12;
        }
      });

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderFrame);
    };

    renderFrame();

    const handleResize = () => {
      const nextWidth = mount.clientWidth;
      const nextHeight = mount.clientHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(frameId);
      renderer.dispose();
      scene.traverse((child) => {
        if (child.geometry) {
          child.geometry.dispose();
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [quadrant]);

  return <div className="tactical-scene" ref={mountRef} aria-label="tactical display" />;
}

function App() {
  const [game, setGame] = useState(() => initializeGame());
  const [sensorMode, setSensorMode] = useState('short');

  const quadrant = game.galaxy[game.shipQuadrant.row][game.shipQuadrant.col];
  const longRangeCells = createLongRangeCells(game.galaxy, game.shipQuadrant);

  return (
    <main className="bridge">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Super Star Trek / Three.js Tactical Bridge</p>
          <h1>Sensor Readout</h1>
          <p className="hero-text">
            Short range shows the 8x8 sector grid for the current quadrant. Long range
            shows the full galaxy — each quadrant tagged with a three-digit code for
            planets, enemies, and bases.
          </p>
        </div>

        <div className="status-strip" aria-label="ship status">
          <div>
            <span className="status-label">Quadrant</span>
            <strong>
              {game.shipQuadrant.row + 1}-{game.shipQuadrant.col + 1}
            </strong>
          </div>
          <div>
            <span className="status-label">Sector</span>
            <strong>
              {game.shipSector.row + 1}-{game.shipSector.col + 1}
            </strong>
          </div>
          <div>
            <span className="status-label">Stardate</span>
            <strong>{game.stardate}</strong>
          </div>
        </div>
      </section>

      <section className="bridge-layout">
        <article className="display-card tactical-card">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Sensor Array</p>
              <h2>{sensorMode === 'short' ? 'Short Range Sensors' : 'Long Range Sensors'}</h2>
            </div>
            <div className="sensor-mode-toggle">
              <button
                className={sensorMode === 'short' ? 'active' : ''}
                onClick={() => setSensorMode('short')}
              >
                Short Range
              </button>
              <button
                className={sensorMode === 'long' ? 'active' : ''}
                onClick={() => setSensorMode('long')}
              >
                Long Range
              </button>
            </div>
          </div>

          {sensorMode === 'short' ? (
            <TacticalScene quadrant={quadrant} />
          ) : (
            <div className="long-range-grid long-range-grid--expanded" aria-label="long range sensor grid">
              {longRangeCells.map((cell) => (
                <div
                  className={`long-range-cell${cell.active ? ' active' : ''}`}
                  key={cell.key}
                >
                  <span>{cell.label}</span>
                  <strong>{cell.code}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <aside className="side-column">
          <article className="display-card">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Helm Control</p>
                <h2>Command Panel</h2>
              </div>
              <button className="reset-button" onClick={() => setGame(initializeGame())}>
                New Galaxy
              </button>
            </div>

            <div className="command-cluster">
              <button onClick={() => setGame((current) => moveShip(current, -1, 0))}>
                Impulse North
              </button>
              <button onClick={() => setGame((current) => moveShip(current, 1, 0))}>
                Impulse South
              </button>
              <button onClick={() => setGame((current) => moveShip(current, 0, -1))}>
                Impulse West
              </button>
              <button onClick={() => setGame((current) => moveShip(current, 0, 1))}>
                Impulse East
              </button>
              <button onClick={() => setGame((current) => warpShip(current, -1, 0))}>
                Warp North
              </button>
              <button onClick={() => setGame((current) => warpShip(current, 1, 0))}>
                Warp South
              </button>
              <button onClick={() => setGame((current) => warpShip(current, 0, -1))}>
                Warp West
              </button>
              <button onClick={() => setGame((current) => warpShip(current, 0, 1))}>
                Warp East
              </button>
            </div>

            <div className="legend">
              <span>* star</span>
              <span>K enemy</span>
              <span>B base</span>
              <span>E ship</span>
            </div>

            <p className="command-log">{game.commandLog}</p>
          </article>
        </aside>
      </section>
    </main>
  );
}

export default App;
