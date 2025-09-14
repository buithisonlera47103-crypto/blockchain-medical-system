"""
EMR系统 Python API使用示例
"""

import requests
import json
from typing import Optional, Dict, Any

class EMRClient:
    def __init__(self, base_url: str = 'http://localhost:3000/api/v1'):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.session = requests.Session()

    def set_token(self, token: str):
        """设置认证令牌"""
        self.token = token
        self.session.headers.update({'Authorization': f'Bearer {token}'})

    def request(self, endpoint: str, method: str = 'GET', 
                data: Optional[Dict] = None, files: Optional[Dict] = None) -> Dict[Any, Any]:
        """通用请求方法"""
        url = f"{self.base_url}{endpoint}"
        
        headers = {}
        if data and not files:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(data)

        response = self.session.request(
            method=method,
            url=url,
            data=data,
            files=files,
            headers=headers
        )

        if not response.ok:
            error_data = response.json()
            raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")

        return response.json()

    def register(self, user_data: Dict) -> Dict:
        """用户注册"""
        return self.request('/auth/register', method='POST', data=user_data)

    def login(self, username: str, password: str) -> Dict:
        """用户登录"""
        response = self.request('/auth/login', method='POST', data={
            'username': username,
            'password': password
        })
        
        self.set_token(response['token'])
        return response

    def get_records(self, **params) -> Dict:
        """获取病历列表"""
        endpoint = '/records'
        if params:
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            endpoint += f"?{query_string}"
        
        return self.request(endpoint)

    def upload_record(self, file_path: str, patient_id: str, title: str, 
                     record_type: str, department: str = '') -> Dict:
        """上传病历"""
        with open(file_path, 'rb') as file:
            files = {'file': file}
            data = {
                'patientId': patient_id,
                'title': title,
                'recordType': record_type,
                'department': department
            }
            
            # 对于文件上传，我们需要直接使用requests
            url = f"{self.base_url}/records"
            response = self.session.post(url, data=data, files=files)
            
            if not response.ok:
                error_data = response.json()
                raise Exception(f"Upload failed: {error_data.get('message')}")
            
            return response.json()

    def download_record(self, record_id: str, save_path: str):
        """下载病历"""
        url = f"{self.base_url}/records/{record_id}/download"
        response = self.session.get(url)
        
        if not response.ok:
            raise Exception("Download failed")
        
        with open(save_path, 'wb') as file:
            file.write(response.content)

    def check_permission(self, record_id: str, action: str) -> Dict:
        """检查权限"""
        return self.request('/permissions/check', method='POST', data={
            'recordId': record_id,
            'action': action
        })

# 使用示例
def main():
    client = EMRClient()

    try:
        # 1. 注册用户
        register_result = client.register({
            'username': 'test_patient_py',
            'email': 'patient.py@test.com',
            'password': 'TestPassword123!',
            'role': 'patient',
            'fullName': 'Python测试患者'
        })
        print('注册成功:', register_result)

        # 2. 登录
        login_result = client.login('test_patient_py', 'TestPassword123!')
        print('登录成功:', login_result)

        # 3. 获取病历列表
        records = client.get_records(
            page=1,
            limit=10,
            sortBy='created_at',
            sortOrder='desc'
        )
        print('病历列表:', records)

        # 4. 上传病历（假设有文件）
        # upload_result = client.upload_record(
        #     file_path='/path/to/medical/record.pdf',
        #     patient_id=login_result['user']['userId'],
        #     title='Python测试病历',
        #     record_type='CT',
        #     department='内科'
        # )
        # print('上传成功:', upload_result)

    except Exception as error:
        print('操作失败:', error)

if __name__ == '__main__':
    main()
