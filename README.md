# Polymarket APR (Chrome Extension)

## Структура проекта

- `polymarket-apr/` - исходный код расширения
- `pictures/` - медиа-материалы и ассеты
- `releases/` - архивы релизов (`.zip`)

## Модель ветвления

- `main` - стабильная ветка для релизов
- `feature/<kebab-case>` - рабочие ветки под отдельные фичи/фиксы
- Каноничный пример: `feature/market-apr`
- Новые feature-ветки создаются только от актуального `main` (не от других feature-веток)

## Создание новой ветки

```bash
git checkout main
git pull --ff-only
git checkout -b feature/<name>
```

## Релизный процесс

1. Создать/обновить feature-ветку от `main`.
2. Внести изменения в `polymarket-apr/`.
3. Прогнать проверки по [TESTING_PRINCIPLES.md](TESTING_PRINCIPLES.md).
4. При релизной упаковке обновить версию в `polymarket-apr/manifest.json`.
5. Собрать архив в `releases/polymarket-apr-vX.Y.zip`.
6. Смержить изменения в `main`.
7. Создать тег `vX.Y` на релизном коммите.

## Загрузка в Chrome

Использовать папку `polymarket-apr/` как unpacked-расширение.
