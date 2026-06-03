import { useState, Fragment } from 'react';
import './App.css';

const GALAXY_SIZE = 8;
const SECTOR_SIZE = 8;

const objectGlyphs = {
  star: '*',
  enemy: 'K',
  base: 'B',
  ship: 'E',
};

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

function createShortRangeCells(quadrant, shipSector) {
  return quadrant.sectors.flatMap((row, rowIndex) =>
    row.map((type, colIndex) => ({
      key: `${rowIndex}:${colIndex}`,
      label: `${rowIndex + 1}-${colIndex + 1}`,
      glyph: type !== 'empty' ? (objectGlyphs[type] ?? '?') : '',
      type,
      active: rowIndex === shipSector.row && colIndex === shipSector.col,
    }))
  );
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

function App() {
  const [game, setGame] = useState(() => initializeGame());
  const [sensorMode, setSensorMode] = useState('short');

  const quadrant = game.galaxy[game.shipQuadrant.row][game.shipQuadrant.col];
  const shortRangeCells = createShortRangeCells(quadrant, game.shipSector);
  const longRangeCells = createLongRangeCells(game.galaxy, game.shipQuadrant);

  return (
    <main className="bridge">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Super Star Trek / Tactical Bridge</p>
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
            <div className="sensor-grid-outer" aria-label="short range sensor grid">
              <div className="sensor-corner" />
              {Array.from({ length: SECTOR_SIZE }, (_, i) => (
                <div key={i} className="sensor-axis-label">{i + 1}</div>
              ))}
              {Array.from({ length: SECTOR_SIZE }, (_, rowIndex) => (
                <Fragment key={rowIndex}>
                  <div className="sensor-axis-label">{rowIndex + 1}</div>
                  {shortRangeCells.slice(rowIndex * SECTOR_SIZE, (rowIndex + 1) * SECTOR_SIZE).map((cell) => (
                    <div
                      className={`long-range-cell long-range-cell--${cell.type}${cell.active ? ' active' : ''}`}
                      key={cell.key}
                    >
                      {cell.glyph && <strong>{cell.glyph}</strong>}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="sensor-grid-outer" aria-label="long range sensor grid">
              <div className="sensor-corner" />
              {Array.from({ length: GALAXY_SIZE }, (_, i) => (
                <div key={i} className="sensor-axis-label">{i + 1}</div>
              ))}
              {Array.from({ length: GALAXY_SIZE }, (_, rowIndex) => (
                <Fragment key={rowIndex}>
                  <div className="sensor-axis-label">{rowIndex + 1}</div>
                  {longRangeCells.slice(rowIndex * GALAXY_SIZE, (rowIndex + 1) * GALAXY_SIZE).map((cell) => (
                    <div
                      className={`long-range-cell${cell.active ? ' active' : ''}`}
                      key={cell.key}
                    >
                      <strong>{cell.code}</strong>
                    </div>
                  ))}
                </Fragment>
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
