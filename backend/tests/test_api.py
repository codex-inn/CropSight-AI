from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    response = client.get('/health')
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'ok'
    assert body['model_mode'] == 'demo'


def test_analyze_validation_rejects_wrong_mime():
    response = client.post(
        '/api/v1/analyze',
        data={'crop_type': 'tomato', 'field_id': 'field-1'},
        files={'image': ('sample.txt', b'bad', 'text/plain')},
    )
    assert response.status_code == 400


def test_analyze_response_shape():
    response = client.post(
        '/api/v1/analyze',
        data={'crop_type': 'tomato', 'field_id': 'field-1', 'latitude': '0.123', 'longitude': '0.456'},
        files={'image': ('sample.png', b'fake-image-bytes', 'image/png')},
    )

    assert response.status_code == 200
    body = response.json()

    assert 'detections' in body
    assert 'maturityCounts' in body
    assert set(body['maturityCounts']).issuperset({'harvestReady', 'nearlyReady', 'developing'})
    assert 'model' in body
    assert body['model']['mode'] == 'demo'
    assert 'warnings' in body
