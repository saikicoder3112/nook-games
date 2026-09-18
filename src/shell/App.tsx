import type { CSSProperties } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { games, getGame } from '../games/register'
import { GameChrome } from './GameChrome'

export function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="wordmark">
          Nook <span>games</span>
        </Link>
        <div className="topbar-note">PvE · chơi ngay · thêm game bằng 1 file</div>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/g/:id" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="hero">
        <h1>Một kệ game, mỗi trò một hộp.</h1>
        <p>
          Chơi trực tiếp trong trình duyệt, không tài khoản, không database. Muốn thêm
          game mới thì viết engine + màn hình, rồi đăng ký vào catalog.
        </p>
      </section>
      <section className="catalog">
        {games.map((game) => (
          <Link
            key={game.meta.id}
            to={`/g/${game.meta.id}`}
            className="game-card"
            style={{ '--accent': game.meta.accent } as CSSProperties}
          >
            <div className="preview">{game.Preview ? <game.Preview /> : game.meta.title[0]}</div>
            <div>
              <h2>{game.meta.title}</h2>
              <p>{game.meta.blurb}</p>
              <div className="tags">
                {game.meta.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </section>
      <p className="add-hint">
        Thêm game: tạo <code>src/games/ten-game/</code> với <code>View</code> +{' '}
        <code>meta</code>, export <code>GameEntry</code>, rồi đẩy vào mảng trong{' '}
        <code>src/games/register.ts</code>.
      </p>
    </>
  )
}

function GamePage() {
  const { id } = useParams()
  const game = id ? getGame(id) : undefined
  if (!game) {
    return <Navigate to="/" replace />
  }
  const View = game.View
  return (
    <GameChrome title={game.meta.title}>
      <View />
    </GameChrome>
  )
}
