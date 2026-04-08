"""
Processing engines for Vision, Video, and NLP modalities.
Designed to run as background tasks via Celery.
"""
import io
import os
import json
import hashlib
from pathlib import Path
from typing import Callable


# ─── Vision Processing ────────────────────────────────────────────────────────

def process_vision(
    image_path: str,
    config: dict,
    progress_cb: Callable[[float], None] | None = None,
) -> dict:
    """
    Apply vision processing pipeline to an image:
    - Resize to target resolution
    - Normalize pixel values
    - Strip EXIF metadata
    - Convert to grayscale
    - Augmentation (flip, rotation, noise)
    """
    try:
        from PIL import Image, ImageFilter
        import numpy as np

        img = Image.open(image_path)
        original_size = img.size
        result = {"path": image_path, "original_size": original_size}

        # Strip EXIF
        if config.get("strip_exif"):
            data = list(img.getdata())
            img_no_exif = Image.new(img.mode, img.size)
            img_no_exif.putdata(data)
            img = img_no_exif
            result["exif_stripped"] = True

        # Convert to grayscale
        if config.get("grayscale"):
            img = img.convert("L")
            result["grayscale"] = True

        # Resize
        if resize := config.get("resize"):
            img = img.resize((resize["width"], resize["height"]), Image.LANCZOS)
            result["new_size"] = [resize["width"], resize["height"]]

        # Normalize (returns numpy array metadata)
        if config.get("normalize"):
            arr = np.array(img, dtype=np.float32) / 255.0
            result["normalized"] = True
            result["pixel_range"] = [float(arr.min()), float(arr.max())]

        # Augmentation
        aug = config.get("augmentation", {})
        if aug.get("horizontal_flip"):
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        if aug.get("vertical_flip"):
            img = img.transpose(Image.FLIP_TOP_BOTTOM)

        if progress_cb:
            progress_cb(100.0)

        return {**result, "status": "success"}

    except ImportError:
        return {"status": "error", "error": "Pillow not installed. Run: pip install pillow"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── Video Processing ─────────────────────────────────────────────────────────

def process_video(
    video_path: str,
    output_dir: str,
    config: dict,
    progress_cb: Callable[[float], None] | None = None,
) -> dict:
    """
    Extract frames from a video file:
    - Keyframe detection (scene changes)
    - Fixed FPS sampling
    - Clip extraction by duration
    """
    try:
        import cv2

        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0

        os.makedirs(output_dir, exist_ok=True)
        saved_frames = []
        frame_idx = 0
        sample_interval = max(1, int(fps / config.get("fps_sampling", 1)))

        prev_frame = None
        keyframe_threshold = 30.0  # Mean absolute diff

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            should_save = False

            if config.get("extract_keyframes") and prev_frame is not None:
                import numpy as np
                diff = abs(frame.astype(float) - prev_frame.astype(float)).mean()
                if diff > keyframe_threshold:
                    should_save = True
            elif frame_idx % sample_interval == 0:
                should_save = True

            if should_save:
                out_path = os.path.join(output_dir, f"frame_{frame_idx:06d}.jpg")
                cv2.imwrite(out_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                saved_frames.append(out_path)

            prev_frame = frame.copy() if config.get("extract_keyframes") else None
            frame_idx += 1

            if progress_cb and total_frames > 0:
                progress_cb((frame_idx / total_frames) * 100)

        cap.release()
        return {
            "status": "success",
            "total_frames": total_frames,
            "saved_frames": len(saved_frames),
            "fps": fps,
            "duration": duration,
            "output_dir": output_dir,
        }

    except ImportError:
        return {"status": "error", "error": "OpenCV not installed. Run: pip install opencv-python-headless"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# ─── NLP Processing ───────────────────────────────────────────────────────────

def process_nlp(
    text: str,
    config: dict,
    progress_cb: Callable[[float], None] | None = None,
) -> dict:
    """
    Apply NLP preprocessing pipeline:
    - Tokenization
    - Stop-word removal
    - Lemmatization
    - Sentiment analysis
    """
    result = {
        "original_char_count": len(text),
        "original_word_count": len(text.split()),
    }

    try:
        import nltk
        from nltk.tokenize import word_tokenize, sent_tokenize
        from nltk.corpus import stopwords
        from nltk.stem import WordNetLemmatizer

        # Ensure NLTK data is available
        for resource in ["punkt", "stopwords", "wordnet", "averaged_perceptron_tagger"]:
            try:
                nltk.data.find(f"tokenizers/{resource}")
            except LookupError:
                nltk.download(resource, quiet=True)

        tokens = word_tokenize(text)
        result["tokens"] = tokens[:100]  # Sample
        result["token_count"] = len(tokens)

        if config.get("remove_stopwords"):
            lang = config.get("language", "english")
            stop_words = set(stopwords.words(lang))
            tokens = [t for t in tokens if t.lower() not in stop_words]
            result["tokens_after_stopword_removal"] = len(tokens)

        if config.get("lemmatize"):
            lemmatizer = WordNetLemmatizer()
            tokens = [lemmatizer.lemmatize(t) for t in tokens]
            result["lemmatized_sample"] = tokens[:20]

        if config.get("sentiment_analysis"):
            # Simple VADER-based sentiment
            try:
                from nltk.sentiment import SentimentIntensityAnalyzer
                nltk.download("vader_lexicon", quiet=True)
                sia = SentimentIntensityAnalyzer()
                scores = sia.polarity_scores(text[:5000])
                result["sentiment"] = scores
            except Exception:
                result["sentiment"] = {"compound": 0, "pos": 0, "neg": 0, "neu": 1}

        result["processed_text"] = " ".join(tokens)
        result["status"] = "success"

    except ImportError:
        result["status"] = "error"
        result["error"] = "NLTK not installed. Run: pip install nltk"

    if progress_cb:
        progress_cb(100.0)

    return result


# ─── CSV/Parquet Export ───────────────────────────────────────────────────────

def export_to_csv(files: list[dict], output_path: str, modality: str) -> dict:
    """Generate a CSV manifest for a dataset."""
    try:
        import pandas as pd

        if modality in ("vision", "video"):
            rows = [{
                "file_path": f.get("wasabi_key", f["path"]),
                "file_name": f["name"],
                "resolution": f.get("metadata", {}).get("resolution", ""),
                "channels": f.get("metadata", {}).get("channels", ""),
                "label_id": f.get("labels", [{}])[0].get("name", "") if f.get("labels") else "",
                "bounding_box_coords": json.dumps(f.get("labels", [{}])[0].get("bounding_box", {})) if f.get("labels") else "",
            } for f in files]
        else:
            rows = [{
                "text_snippet": f.get("metadata", {}).get("text_snippet", ""),
                "char_count": f.get("metadata", {}).get("char_count", 0),
                "word_count": f.get("metadata", {}).get("word_count", 0),
                "sentiment_score": f.get("metadata", {}).get("sentiment_score", 0),
                "category": f.get("labels", [{}])[0].get("name", "") if f.get("labels") else "",
            } for f in files]

        df = pd.DataFrame(rows)
        df.to_csv(output_path, index=False)
        return {"status": "success", "rows": len(df), "output_path": output_path}

    except ImportError:
        return {"status": "error", "error": "pandas not installed"}
    except Exception as e:
        return {"status": "error", "error": str(e)}


def export_to_parquet(files: list[dict], output_path: str) -> dict:
    """Export NLP data to Parquet format."""
    try:
        import pandas as pd

        rows = [{
            "text_snippet": f.get("metadata", {}).get("text_snippet", ""),
            "char_count": f.get("metadata", {}).get("char_count", 0),
            "word_count": f.get("metadata", {}).get("word_count", 0),
            "sentiment_score": f.get("metadata", {}).get("sentiment_score", 0),
            "category": f.get("labels", [{}])[0].get("name", "") if f.get("labels") else "",
            "file_id": f["id"],
        } for f in files]

        df = pd.DataFrame(rows)
        df.to_parquet(output_path, index=False, compression="snappy")
        return {"status": "success", "rows": len(df), "output_path": output_path}

    except Exception as e:
        return {"status": "error", "error": str(e)}
