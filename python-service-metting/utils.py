from time import time

def get_time(func):
    """Decorator to measure execution time of functions."""
    def wrapper(*args, **kwargs):
        start_time = time()
        result = func(*args, **kwargs)
        end_time = time()
        print(f"[TIME] {func.__name__} took {end_time - start_time:.2f} seconds")
        return result
    return wrapper


def format_timestamp(seconds: float) -> str:
        """Convert seconds to [MM:SS] format."""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"[{minutes:02d}:{secs:02d}]"