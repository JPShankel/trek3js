import { useState, useEffect, useRef, Fragment } from 'react';
import './App.css';
import { CellGlyph } from './Glyphs';

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

function countEnemies(galaxy) {
  return galaxy.reduce((total, row) =>
    total + row.reduce((sum, q) => sum + q.enemies, 0), 0);
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

function revealAround(revealed, row, col) {
  const next = new Set(revealed);
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < GALAXY_SIZE && c >= 0 && c < GALAXY_SIZE) {
        next.add(`${r}:${c}`);
      }
    }
  }
  return next;
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
    stardate: countEnemies(galaxy) * 3,
    commandLog: 'Bridge online. Short range sensors and long range scan ready.',
    revealedQuadrants: revealAround(new Set(), quadrant.row, quadrant.col),
    torpedoes: 10,
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
    stardate: Math.round((game.stardate - 0.1) * 10) / 10,
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
    stardate: game.stardate - 1,
    commandLog: `Warp complete. Entered quadrant ${quadrantRow + 1}-${quadrantCol + 1}.`,
    revealedQuadrants: revealAround(game.revealedQuadrants, quadrantRow, quadrantCol),
  };
}

function createShortRangeCells(quadrant, shipSector) {
  return quadrant.sectors.flatMap((row, rowIndex) =>
    row.map((type, colIndex) => ({
      key: `${rowIndex}:${colIndex}`,
      row: rowIndex,
      col: colIndex,
      type,
      active: rowIndex === shipSector.row && colIndex === shipSector.col,
    }))
  );
}

function createLongRangeCells(galaxy, shipQuadrant) {
  return galaxy.flatMap((row, rowIndex) =>
    row.map((quadrant, colIndex) => ({
      key: `${rowIndex}:${colIndex}`,
      row: rowIndex,
      col: colIndex,
      code: `${quadrant.planets}${quadrant.bases}${quadrant.enemies}`,
      active: rowIndex === shipQuadrant.row && colIndex === shipQuadrant.col,
    }))
  );
}

function isCardinallyAdjacent(r1, c1, r2, c2) {
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function destroyEnemy(game, row, col) {
  const nextGalaxy = cloneGalaxy(game.galaxy);
  const q = nextGalaxy[game.shipQuadrant.row][game.shipQuadrant.col];
  q.sectors[row][col] = 'empty';
  q.enemies = Math.max(0, q.enemies - 1);
  return { ...game, galaxy: nextGalaxy };
}

function computeImpulsePath(fromRow, fromCol, toRow, toCol) {
  const steps = [];
  let r = fromRow;
  let c = fromCol;
  while (r !== toRow || c !== toCol) {
    r += toRow > r ? 1 : toRow < r ? -1 : 0;
    c += toCol > c ? 1 : toCol < c ? -1 : 0;
    steps.push({ row: r, col: c });
  }
  return steps;
}

function App() {
  const [game, setGame] = useState(() => initializeGame());
  const [sensorMode, setSensorMode] = useState('short');
  const [contextMenu, setContextMenu] = useState(null);
  const [previewPath, setPreviewPath] = useState(null);
  const [pendingPath, setPendingPath] = useState(null);
  const [torpedo, setTorpedo] = useState(null);
  const [laser, setLaser] = useState(null);
  const sensorGridRef = useRef(null);

  useEffect(() => {
    if (!pendingPath || pendingPath.length === 0) return;
    const timer = setTimeout(() => {
      const next = pendingPath[0];
      const newGame = moveShip(game, next.row - game.shipSector.row, next.col - game.shipSector.col);
      setGame(newGame);
      const moved = newGame.shipSector.row === next.row && newGame.shipSector.col === next.col;
      const remaining = pendingPath.slice(1);
      setPendingPath(moved && remaining.length > 0 ? remaining : null);
    }, 200);
    return () => clearTimeout(timer);
  }, [game, pendingPath]);

  useEffect(() => {
    if (!torpedo) return;
    const timer = setTimeout(() => {
      const sectors = game.galaxy[game.shipQuadrant.row][game.shipQuadrant.col].sectors;
      const cellType = sectors[torpedo.pos.row][torpedo.pos.col];
      if (cellType !== 'empty') {
        if (cellType === 'enemy') {
          setGame((current) => destroyEnemy(current, torpedo.pos.row, torpedo.pos.col));
        }
        setTorpedo(null);
      } else if (torpedo.remaining.length > 0) {
        const [next, ...rest] = torpedo.remaining;
        setTorpedo({ pos: next, remaining: rest });
      } else {
        setTorpedo(null);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [torpedo, game]);

  useEffect(() => {
    if (!laser) return;
    const timer = setTimeout(() => {
      setGame((current) => destroyEnemy(current, laser.targetRow, laser.targetCol));
      setLaser(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [laser]);

  function closeContextMenu() {
    setContextMenu(null);
    setPreviewPath(null);
  }

  function handleCellContext(e, gridType, row, col, cellType = 'empty') {
    e.preventDefault();
    if (gridType === 'short' && cellType === 'empty') {
      const sectors = game.galaxy[game.shipQuadrant.row][game.shipQuadrant.col].sectors;
      const fullPath = computeImpulsePath(game.shipSector.row, game.shipSector.col, row, col);
      const blockedAt = fullPath.findIndex((p) => sectors[p.row][p.col] !== 'empty');
      setPreviewPath(blockedAt === -1 ? fullPath : fullPath.slice(0, blockedAt));
    } else {
      setPreviewPath(null);
    }
    setContextMenu({ gridType, row, col, cellType, x: e.clientX, y: e.clientY });
  }

  function handleWarpHere() {
    setGame((current) =>
      warpShip(current, contextMenu.row - current.shipQuadrant.row, contextMenu.col - current.shipQuadrant.col)
    );
    closeContextMenu();
  }

  function handleImpulseHere() {
    setPendingPath(previewPath);
    closeContextMenu();
  }

  function handleDockHere() {
    setGame((current) => ({ ...current, torpedoes: 10 }));
    closeContextMenu();
  }

  function handleFireTorpedo() {
    if ((game.torpedoes ?? 10) <= 0) return;
    const path = computeImpulsePath(
      game.shipSector.row, game.shipSector.col,
      contextMenu.row, contextMenu.col
    );
    if (path.length > 0) {
      setTorpedo({ pos: path[0], remaining: path.slice(1) });
      setGame((current) => ({ ...current, torpedoes: Math.max(0, (current.torpedoes ?? 10) - 1) }));
    }
    closeContextMenu();
  }

  function handleFireLaser() {
    const wrap = sensorGridRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const shipKey = `${game.shipSector.row}:${game.shipSector.col}`;
    const targetKey = `${contextMenu.row}:${contextMenu.col}`;
    const shipEl = wrap.querySelector(`[data-cell-key="${shipKey}"]`);
    const targetEl = wrap.querySelector(`[data-cell-key="${targetKey}"]`);
    if (!shipEl || !targetEl) return;
    const sr = shipEl.getBoundingClientRect();
    const tr = targetEl.getBoundingClientRect();
    setLaser({
      x1: sr.left + sr.width / 2 - wrapRect.left,
      y1: sr.top + sr.height / 2 - wrapRect.top,
      x2: tr.left + tr.width / 2 - wrapRect.left,
      y2: tr.top + tr.height / 2 - wrapRect.top,
      targetRow: contextMenu.row,
      targetCol: contextMenu.col,
    });
    closeContextMenu();
  }

  const quadrant = game.galaxy[game.shipQuadrant.row][game.shipQuadrant.col];
  const shortRangeCells = createShortRangeCells(quadrant, game.shipSector);
  const longRangeCells = createLongRangeCells(game.galaxy, game.shipQuadrant);
  const pendingPathSet = pendingPath ? new Set(pendingPath.map((p) => `${p.row}:${p.col}`)) : null;
  const previewPathSet = previewPath ? new Set(previewPath.map((p) => `${p.row}:${p.col}`)) : null;

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
            <span className="status-label">Time Remaining</span>
            <strong>{(game.stardate ?? 0).toFixed(1)}</strong>
          </div>
          <div>
            <span className="status-label">Torpedoes</span>
            <strong>{game.torpedoes ?? 10}</strong>
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
            <div className="sensor-grid-wrap" ref={sensorGridRef}>
              <div className="sensor-grid-outer" aria-label="short range sensor grid">
                <div className="sensor-corner" />
                {Array.from({ length: SECTOR_SIZE }, (_, i) => (
                  <div key={i} className="sensor-axis-label">{i + 1}</div>
                ))}
                {Array.from({ length: SECTOR_SIZE }, (_, rowIndex) => (
                  <Fragment key={rowIndex}>
                    <div className="sensor-axis-label">{rowIndex + 1}</div>
                    {shortRangeCells.slice(rowIndex * SECTOR_SIZE, (rowIndex + 1) * SECTOR_SIZE).map((cell) => {
                      const onPath = pendingPathSet?.has(cell.key);
                      const onPreview = previewPathSet?.has(cell.key);
                      const isTorpedo = torpedo?.pos.row === cell.row && torpedo?.pos.col === cell.col;
                      const isAdjacentBase = cell.type === 'base' && isCardinallyAdjacent(
                        game.shipSector.row, game.shipSector.col, cell.row, cell.col
                      );
                      const clickable = !pendingPath && !torpedo && !laser && !cell.active &&
                        (cell.type === 'empty' || cell.type === 'enemy' || isAdjacentBase);
                      return (
                        <div
                          className={`long-range-cell long-range-cell--${cell.type}${cell.active ? ' active' : ''}${onPath ? ' path' : ''}${onPreview ? ' preview-path' : ''}${isTorpedo ? ' torpedo' : ''}`}
                          key={cell.key}
                          data-cell-key={cell.key}
                          onClick={clickable ? (e) => handleCellContext(e, 'short', cell.row, cell.col, cell.type) : undefined}
                          onContextMenu={clickable ? (e) => handleCellContext(e, 'short', cell.row, cell.col, cell.type) : undefined}
                        >
                          {cell.type !== 'empty' && <CellGlyph type={cell.type} />}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
              {laser && (
                <svg className="laser-svg" aria-hidden="true">
                  <line className="laser-line laser-line--glow" x1={laser.x1} y1={laser.y1} x2={laser.x2} y2={laser.y2} />
                  <line className="laser-line" x1={laser.x1} y1={laser.y1} x2={laser.x2} y2={laser.y2} />
                </svg>
              )}
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
                  {longRangeCells.slice(rowIndex * GALAXY_SIZE, (rowIndex + 1) * GALAXY_SIZE).map((cell) => {
                    const isRevealed = game.revealedQuadrants.has(cell.key);
                    const blocked = cell.active || pendingPath || torpedo || laser;
                    const isSelected = contextMenu?.gridType === 'long' &&
                      contextMenu.row === cell.row && contextMenu.col === cell.col;
                    return (
                      <div
                        className={`long-range-cell${cell.active ? ' active' : ''}${!isRevealed ? ' fogged' : ''}${isSelected ? ' selected' : ''}`}
                        key={cell.key}
                        onClick={blocked ? undefined : (e) => handleCellContext(e, 'long', cell.row, cell.col)}
                        onContextMenu={blocked ? undefined : (e) => handleCellContext(e, 'long', cell.row, cell.col)}
                      >
                        {isRevealed && <strong>{cell.code}</strong>}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          )}
        </article>


      </section>

      {contextMenu && (
        <>
          <div className="context-menu-backdrop" onClick={closeContextMenu} />
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {contextMenu.gridType === 'long' ? (
              <button onClick={handleWarpHere}>Warp here</button>
            ) : contextMenu.cellType === 'enemy' ? (
              <>
                <button onClick={handleFireTorpedo} disabled={(game.torpedoes ?? 10) <= 0}>
                  Fire torpedo ({game.torpedoes ?? 10})
                </button>
                <button onClick={handleFireLaser}>Fire laser</button>
              </>
            ) : contextMenu.cellType === 'base' ? (
              <button onClick={handleDockHere}>Dock here</button>
            ) : (
              <button onClick={handleImpulseHere}>Impulse here</button>
            )}
            <button className="context-menu-cancel" onClick={closeContextMenu}>Cancel</button>
          </div>
        </>
      )}
    </main>
  );
}

export default App;
