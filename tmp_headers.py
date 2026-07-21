import urllib.request

url = 'https://storage.googleapis.com/eas-workflows-production/logs/6b2238e0-7549-4996-a882-78ab5be0436a/dd69afd0-cbbd-4160-bf7c-cca87011d233/2026-07-20T04%3A59%3A39Z-42082792-734a-4349-b5b0-dabbc894affa.txt?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=www-production%40exponentjs.iam.gserviceaccount.com%2F20260720%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20260720T050101Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host&X-Goog-Signature=4764e0ca20bf4eeff79147c8e6d490cec3e5a71c6824cd9eefedf1887c727518306f64204b5c63113a4451fa37c828a26966530d707398747ea408b955d667be5b7aa1d0076321fea21c569007c5813f0d9b1c41db1f7751c8a16a1a245ffdcc60304b868562b6b308f3d2af4dbe7ba8fec368f3fede445ca4889f456134d51e62d6c88307f71fe5c1e2901c163b2d8abeacdec9e495d9443f364f74a9c30a9b33c678dadfdb5e8d4df0ea0d6599d75d0ccfd037c034ebf6fda63083ce9e89d59bfea36875369eefbe2701b54eb363ede5ebd14b29f4bd8620408f1a84af2dc0b0c73e106a529b29785d53d5f6911fac269a09d893c0526500c878ab4e2e9327'

try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        headers = response.info()
        print("Headers:")
        print(headers)
except Exception as e:
    print("Error:", e)
