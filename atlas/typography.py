"""Validate only selected font identifiers; never collect a user's font inventory."""
import re
FONT_LANGUAGES={'en','zh','zh-Hans','zh-Hant','ja','ko','fr','de','es','pt','it','ru','ar','hi','th','vi','id'}

def valid_font(value):
    return isinstance(value,str) and (not value or bool(re.fullmatch(r'[a-z0-9-]{1,50}',value)) or bool(re.fullmatch(r'(?:local|custom):[^\x00-\x1f;{}<>]{1,120}',value)))

def name_fonts(value):
    if not isinstance(value,dict) or len(value)>32 or any(language not in FONT_LANGUAGES or not valid_font(font) for language,font in value.items()):
        raise ValueError('Invalid name font mapping')
    return dict(value)
