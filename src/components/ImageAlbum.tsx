import { useState } from 'react'

type AlbumImage = {
  src: string
  label: string
  alt: string
}

export function ImageAlbum({ images }: { images: ReadonlyArray<AlbumImage> }) {
  const [index, setIndex] = useState(0)
  const current = images[index]
  if (!current) return null

  function move(direction: number) {
    setIndex((value) => (value + direction + images.length) % images.length)
  }

  return (
    <figure className="image-album">
      <div className="image-album__stack" aria-hidden="true">
        {images.slice(0, 2).map((image, stackIndex) => (
          <img key={image.src} src={image.src} alt="" style={{ '--stack-index': stackIndex } as React.CSSProperties} />
        ))}
      </div>
      <img className="image-album__active" src={current.src} alt={current.alt} />
      <figcaption>{current.label}</figcaption>
      <div className="image-album__controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous image">
          ←
        </button>
        <span>
          {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
        <button type="button" onClick={() => move(1)} aria-label="Next image">
          →
        </button>
      </div>
    </figure>
  )
}
