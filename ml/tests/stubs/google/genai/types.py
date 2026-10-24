class Part:
    @staticmethod
    def from_bytes(data, mime_type): return ("part", len(data), mime_type)


class GenerateContentConfig:
    def __init__(self, **kw): self.kw = kw
