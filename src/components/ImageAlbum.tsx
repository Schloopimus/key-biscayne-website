import { useState, type CSSProperties } from 'react'

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

  const stackedImages = [1, 2]
    .map((offset) => images[(index + offset) % images.length])
    .filter((image): image is AlbumImage => Boolean(image))

  return (
    <figure className="image-album">
      <div className="image-album__stack" aria-hidden="true">
        {stackedImages.map((image, stackIndex) => (
          <img
            key={`${image.src}-${index}`}
            src={image.src}
            alt=""
            style={{ '--stack-index': stackIndex } as CSSProperties}
          />
        ))}
      </div>
      <button
        className="image-album__shuffle"
        type="button"
        onClick={() => move(1)}
        aria-label={`Show next image. Currently showing ${current.label}`}
      >
        <img className="image-album__active" src={current.src} alt={current.alt} />
        <span>Tap to shuffle</span>
      </button>
      <figcaption aria-live="polite">{current.label}</figcaption>
      <div className="image-album__controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous image">
          ←
        </button>
        <span aria-live="polite">
          {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        </span>
        <button type="button" onClick={() => move(1)} aria-label="Next image">
          →
        </button>
      </div>
    </figure>
  )
}
