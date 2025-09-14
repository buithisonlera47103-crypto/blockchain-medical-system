/**
 * EMR系统 JavaScript API使用示例
 */

class EMRClient {
  constructor(baseUrl = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  // 设置认证令牌
  setToken(token) {
    this.token = token;
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.message}`);
    }

    return response.json();
  }

  // 用户注册
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // 用户登录
  async login(username, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    this.setToken(response.token);
    return response;
  }

  // 获取病历列表
  async getRecords(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/records?${queryString}`);
  }

  // 上传病历
  async uploadRecord(formData) {
    return this.request('/records', {
      method: 'POST',
      headers: {}, // 让浏览器自动设置Content-Type
      body: formData,
    });
  }

  // 下载病历
  async downloadRecord(recordId) {
    const url = `${this.baseUrl}/records/${recordId}/download`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  // 检查权限
  async checkPermission(recordId, action) {
    return this.request('/permissions/check', {
      method: 'POST',
      body: JSON.stringify({ recordId, action }),
    });
  }
}

// 使用示例
async function example() {
  const client = new EMRClient();

  try {
    // 1. 注册用户
    const registerResult = await client.register({
      username: 'test_patient',
      email: 'patient@test.com',
      password: 'TestPassword123!',
      role: 'patient',
      fullName: '测试患者',
    });
    console.log('注册成功:', registerResult);

    // 2. 登录
    const loginResult = await client.login('test_patient', 'TestPassword123!');
    console.log('登录成功:', loginResult);

    // 3. 获取病历列表
    const records = await client.getRecords({
      page: 1,
      limit: 10,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    console.log('病历列表:', records);

    // 4. 上传病历
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', loginResult.user.userId);
      formData.append('title', '测试病历');
      formData.append('recordType', 'CT');
      formData.append('department', '内科');

      const uploadResult = await client.uploadRecord(formData);
      console.log('上传成功:', uploadResult);
    }
  } catch (error) {
    console.error('操作失败:', error);
  }
}
