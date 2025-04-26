
      let apiData = { categories: {}, stats: {} };
      let settingsData = {};
      let serverStartTime = new Date();
      let averageResponseTime = 0;
      let responseTimeCount = 0;
      let currentApiParams = [];

      async function fetchSettings() {
    try {
        const response = await fetch('server/settings.json'); 
        if (!response.ok) {
            throw new Error(`Failed to fetch settings.json: ${response.status} ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('settings.json is not a valid JSON file');
        }
        settingsData = await response.json();
        console.log('Settings data loaded:', settingsData);

     
        Object.keys(apiData.categories).forEach(category => {
            apiData.categories[category].forEach(api => {
                api.responseTime = Math.floor(Math.random() * 100 + 100);
            });
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        settingsData = {};
    }
}

      async function fetchApiData() {
          try {
              const response = await fetch('/api/metadata');
              apiData = await response.json();

           
              Object.keys(apiData.categories).forEach(category => {
                  apiData.categories[category].forEach(api => {
                      api.responseTime = Math.floor(Math.random() * 100 + 100);
                  });
              });

            
              document.getElementById('total-apis').textContent = apiData.stats.totalApis;
              document.getElementById('get-apis').textContent = apiData.stats.getApis;
              document.getElementById('post-apis').textContent = apiData.stats.postApis;

             
              updateApiCalls();

             
              const sidebarCategories = document.getElementById('sidebar-categories');
              sidebarCategories.innerHTML = '';
              Object.keys(apiData.categories).forEach(category => {
                  const li = document.createElement('li');
                  li.innerHTML = `
                      <a href="#" class="category-link flex items-center p-2 rounded-md hover:bg-gray-700/50" data-category="${category}">
                          <i class="fa-solid fa-folder text-sm mr-2"></i>
                          ${category.charAt(0).toUpperCase() + category.slice(1)}
                      </a>
                  `;
                  sidebarCategories.appendChild(li);
              });

             
              const categoryCards = document.getElementById('category-cards');
              categoryCards.innerHTML = '';
              Object.keys(apiData.categories).forEach(category => {
                  const categoryApis = apiData.categories[category];
                  const getCount = categoryApis.filter(api => api.method === 'GET').length;
                  const postCount = categoryApis.filter(api => api.method === 'POST').length;
                  const putCount = categoryApis.filter(api => api.method === 'PUT').length;

                  const card = document.createElement('div');
                  card.className = 'bg-gray-800 p-5 rounded-lg border border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer category-card';
                  card.dataset.category = category;
                  card.innerHTML = `
                      <div class="flex items-center mb-3">
                          <div class="p-3 rounded-md bg-purple-900/30 text-purple-400">
                              <i class="fa-solid fa-folder text-lg"></i>
                          </div>
                          <h4 class="ml-3 font-semibold text-white">${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                      </div>
                      <p class="text-sm text-gray-400 mb-3">${category} APIs</p>
                      <div class="flex items-center gap-2">
                          ${getCount > 0 ? `<span class="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded text-xs font-medium">${getCount} GET</span>` : ''}
                          ${postCount > 0 ? `<span class="bg-green-900/30 text-green-400 px-2 py-0.5 rounded text-xs font-medium">${postCount} POST</span>` : ''}
                          ${putCount > 0 ? `<span class="bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded text-xs font-medium">${putCount} PUT</span>` : ''}
                      </div>
                  `;
                  categoryCards.appendChild(card);
              });

             
              const apiLists = document.getElementById('api-lists');
              apiLists.innerHTML = '';
              Object.keys(apiData.categories).forEach(category => {
                  const categoryApis = apiData.categories[category];
                  const listDiv = document.createElement('div');
                  listDiv.className = 'api-list hidden';
                  listDiv.id = `${category}-apis`;
                  const grid = document.createElement('div');
                  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

                  categoryApis.forEach(api => {
                      const card = document.createElement('div');
                      card.className = 'p-4 rounded-lg border border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer api-card';
                      card.dataset.api = api.name.toLowerCase().replace(/\s+/g, '-');
                      card.dataset.endpoint = api.endpoint;
                      card.dataset.method = api.method;
                      card.dataset.category = category;
                      card.innerHTML = `
                          <div class="flex items-center justify-between mb-3">
                              <h4 class="font-semibold text-white">${api.name}</h4>
                              <span class="px-2 py-1 ${api.method === 'GET' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'} text-xs font-medium rounded">${api.method}</span>
                          </div>
                          <p class="text-sm text-gray-400 mb-3">${api.name} API</p>
                          <div class="text-xs text-gray-400 font-mono bg-gray-700/50 p-2 rounded mb-3">${api.endpoint}</div>
                          <div class="flex items-center justify-between">
                              <div class="flex items-center text-sm text-gray-400">
                                  <i class="fa-solid fa-clock mr-1 text-xs"></i>
                                  ${api.responseTime}ms avg
                              </div>
                              <button class="text-purple-400 hover:text-purple-300 text-sm font-medium">Test API</button>
                          </div>
                      `;
                      grid.appendChild(card);
                  });

                  listDiv.appendChild(grid);
                  apiLists.appendChild(listDiv);
              });

           
              attachCategoryEventListeners();
          } catch (error) {
              console.error('Error fetching API data:', error);
          }
      }

    
      function updateApiCalls() {
          document.getElementById('api-calls-today').textContent = apiData.stats.apiCalls.totalCallsToday.toLocaleString();
          document.getElementById('peak-calls').textContent = apiData.stats.apiCalls.peakCallsPerMinute;
          const change = apiData.stats.apiCalls.totalCallsToday > 0 ? Math.round((apiData.stats.apiCalls.totalCallsToday - 1000) / 1000 * 100) : 0;
          document.getElementById('api-calls-change').textContent = `${change >= 0 ? '+' : ''}${change}% from yesterday`;
      }


      function updateServerPerformance() {
          const now = new Date();
          const elapsedSeconds = (now - serverStartTime) / 1000;

          const responseTime = Math.floor(Math.random() * 100 + 100);
          averageResponseTime = (averageResponseTime * responseTimeCount + responseTime) / (responseTimeCount + 1);
          responseTimeCount++;
          const change = Math.round(responseTime - averageResponseTime);

          document.getElementById('response-time').textContent = `${responseTime}ms`;
          document.getElementById('response-time-change').textContent = `${change >= 0 ? '+' : ''}${change}ms from average`;

          const cpuUsage = Math.floor(Math.random() * 20 + 20);
          document.getElementById('cpu-usage').textContent = `${cpuUsage}%`;

          const memoryUsage = (Math.random() * 2 + 2).toFixed(1);
          document.getElementById('memory-usage').textContent = `${memoryUsage}GB/8GB`;
      }

    
      function updateClockAndStats() {
          const now = new Date();
          const timeString = now.toLocaleTimeString();
          document.getElementById('current-time').textContent = timeString;

          document.getElementById('last-updated').textContent = 'Just now';

          const elapsedSeconds = (now - serverStartTime) / 1000;
          const uptimePercentage = Math.min(100, 99.9 + Math.sin(elapsedSeconds / 10000) * 0.1).toFixed(2);
          document.getElementById('server-uptime').textContent = `${uptimePercentage}%`;

          updateServerPerformance();

          fetch('/api/metadata').then(response => response.json()).then(data => {
              apiData.stats = data.stats;
              updateApiCalls();
          });
      }

      
      document.getElementById('open-sidebar').addEventListener('click', () => {
          document.getElementById('sidebar').classList.add('active');
          document.getElementById('overlay').classList.add('active');
      });

      document.getElementById('close-sidebar').addEventListener('click', () => {
          document.getElementById('sidebar').classList.remove('active');
          document.getElementById('overlay').classList.remove('active');
      });

      document.getElementById('overlay').addEventListener('click', () => {
          document.getElementById('sidebar').classList.remove('active');
          document.getElementById('overlay').classList.remove('active');
      });

     
      function attachCategoryEventListeners() {
          document.querySelectorAll('.category-link, .category-card').forEach(item => {
              item.addEventListener('click', event => {
                  event.preventDefault();
                  const category = item.dataset.category;
                  document.getElementById('dashboard-overview').classList.add('hidden');
                  document.getElementById('api-categories').classList.add('hidden');
                  document.getElementById('api-list-section').classList.remove('hidden');
                  document.getElementById('help-support-section').classList.add('hidden');

                  document.querySelectorAll('.api-list').forEach(list => {
                      list.classList.add('hidden');
                  });

                  document.getElementById(`${category}-apis`).classList.remove('hidden');

                  document.getElementById('category-title').textContent = category.charAt(0).toUpperCase() + category.slice(1);

                  document.querySelectorAll('.category-link').forEach(link => {
                      link.classList.remove('bg-purple-900/30', 'text-purple-400');
                      link.classList.add('hover:bg-gray-700/50');
                  });
                  document.querySelector(`.category-link[data-category="${category}"]`).classList.add('bg-purple-900/30', 'text-purple-400');
                  document.querySelector(`.category-link[data-category="${category}"]`).classList.remove('hover:bg-gray-700/50');

                  document.getElementById('sidebar').classList.remove('active');
                  document.getElementById('overlay').classList.remove('active');
              });
          });
      }

     
      document.getElementById('back-to-categories').addEventListener('click', () => {
          document.getElementById('dashboard-overview').classList.remove('hidden');
          document.getElementById('api-categories').classList.remove('hidden');
          document.getElementById('api-list-section').classList.add('hidden');
          document.getElementById('help-support-section').classList.add('hidden');
      });

  
      document.querySelectorAll('.tab-button').forEach(button => {
          button.addEventListener('click', () => {
              document.querySelectorAll('.tab-button').forEach(btn => {
                  btn.classList.remove('bg-purple-600', 'text-white');
                  btn.classList.add('bg-gray-700', 'text-gray-300', 'hover:bg-gray-600');
              });
              button.classList.remove('bg-gray-700', 'text-gray-300', 'hover:bg-gray-600');
              button.classList.add('bg-purple-600', 'text-white');

              document.querySelectorAll('.tab-content').forEach(content => {
                  content.classList.remove('active');
              });
              document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
          });
      });

 
      document.querySelectorAll('.body-tab-button').forEach(button => {
          button.addEventListener('click', () => {
              document.querySelectorAll('.body-tab-button').forEach(btn => {
                  btn.classList.remove('active');
              });
              button.classList.add('active');

              document.querySelectorAll('.body-tab-content').forEach(content => {
                  content.classList.remove('active');
              });
              document.getElementById(`body-${button.dataset.bodyTab}-container`).classList.add('active');

              updateRequestBodyPreview();
          });
      });

 
      document.addEventListener('click', event => {
          const apiCard = event.target.closest('.api-card');
          if (apiCard) {
              const apiName = apiCard.dataset.api;
              const endpoint = apiCard.dataset.endpoint;
              const method = apiCard.dataset.method;
              const category = apiCard.dataset.category;

           
              const api = apiData.categories[category].find(api => api.name.toLowerCase().replace(/\s+/g, '-') === apiName);
              currentApiParams = api.params || [];

              const modal = document.getElementById('api-test-modal');

          
              document.getElementById('modal-title').textContent = `Test API: ${apiName.charAt(0).toUpperCase() + apiName.slice(1).replace('-', ' ')}`;
              document.getElementById('modal-method').textContent = method;
              document.getElementById('modal-method').className = `px-2 py-1 ${method === 'GET' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'} text-xs font-medium rounded mr-2`;
              document.getElementById('modal-endpoint').textContent = endpoint;
              document.getElementById('modal-description').textContent = `${apiName} API`;
              document.getElementById('modal-response').innerHTML = `<pre>{}</pre>`;
              document.getElementById('modal-response-status').textContent = 'Status: Not Sent';

          
              if (method === 'GET') {
                  const paramsContainer = document.getElementById('params-container');
                  paramsContainer.innerHTML = '';
                  currentApiParams.forEach(param => {
                      const div = document.createElement('div');
                      div.className = 'mb-4';
                      div.innerHTML = `
                          <label class="block text-sm font-medium text-gray-300 mb-1">${param.name} (${param.type})${param.required ? ' <span class="text-red-400">*</span>' : ''}</label>
                          <input type="text" name="${param.name}" placeholder="${param.description}" class="w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-gray-200" ${param.required ? 'required' : ''}>
                          <p class="error-message hidden">This field is required</p>
                      `;
                      paramsContainer.appendChild(div);
                  });
                  document.getElementById('body-inputs').innerHTML = '<p class="text-sm text-gray-400">GET requests do not require a request body.</p>';
                  document.getElementById('body-raw-container').classList.add('hidden');
              } else if (method === 'POST') {
                  const bodyInputs = document.getElementById('body-inputs');
                  bodyInputs.innerHTML = '';
                  currentApiParams.forEach(param => {
                      const div = document.createElement('div');
                      div.className = 'mb-4';
                      div.innerHTML = `
                          <label class="block text-sm font-medium text-gray-300 mb-1">${param.name} (${param.type})${param.required ? ' <span class="text-red-400">*</span>' : ''}</label>
                          <input type="text" name="${param.name}" placeholder="${param.description}" class="w-full p-2 border border-gray-600 rounded-md bg-gray-800 text-gray-200" ${param.required ? 'required' : ''}>
                          <p class="error-message hidden">This field is required</p>
                      `;
                      bodyInputs.appendChild(div);
                  });
                  document.getElementById('body-raw-container').classList.remove('hidden');
                  document.getElementById('params-container').innerHTML = '<p class="text-sm text-gray-400">POST requests use the request body for parameters.</p>';
              }

           
              updateRequestBodyPreview();

              modal.classList.remove('hidden');
              setTimeout(() => {
                  modal.classList.add('active');
              }, 10);
          }
      });

  
      function updateRequestBodyPreview() {
          const method = document.getElementById('modal-method').textContent;
          let requestBody = {};

          if (method === 'POST') {
              const activeBodyTab = document.querySelector('.body-tab-button.active').dataset.bodyTab;
              if (activeBodyTab === 'form') {
                  currentApiParams.forEach(param => {
                      const input = document.querySelector(`#body-inputs input[name="${param.name}"]`);
                      if (input && input.value) {
                          requestBody[param.name] = input.value;
                      }
                  });
              } else if (activeBodyTab === 'raw') {
                  const rawInput = document.getElementById('raw-json-input').value;
                  try {
                      requestBody = JSON.parse(rawInput || '{}');
                      document.getElementById('raw-json-input').classList.remove('input-error');
                      document.querySelector('#body-raw-container .error-message').classList.add('hidden');
                  } catch (e) {
                      requestBody = {};
                      document.getElementById('raw-json-input').classList.add('input-error');
                      document.querySelector('#body-raw-container .error-message').classList.remove('hidden');
                  }
              }
          }

          document.getElementById('modal-request-body').innerHTML = `<pre>${JSON.stringify(requestBody, null, 2)}</pre>`;
      }

    
      document.getElementById('body-inputs').addEventListener('input', updateRequestBodyPreview);
      document.getElementById('raw-json-input').addEventListener('input', updateRequestBodyPreview);


      document.getElementById('reset-request').addEventListener('click', () => {
          document.querySelectorAll('#params-container input, #body-inputs input').forEach(input => {
              input.value = '';
              input.classList.remove('input-error');
              input.nextElementSibling.classList.add('hidden');
          });
          document.getElementById('raw-json-input').value = '';
          document.getElementById('raw-json-input').classList.remove('input-error');
          document.querySelector('#body-raw-container .error-message').classList.add('hidden');
          document.querySelector('input[name="authorization"]').value = '';
          document.querySelector('input[name="x-user-role"]').value = 'user';
          document.getElementById('modal-response').innerHTML = `<pre>{}</pre>`;
          document.getElementById('modal-response-status').textContent = 'Status: Not Sent';
          updateRequestBodyPreview();
      });

     
      document.getElementById('send-request').addEventListener('click', async () => {
          const method = document.getElementById('modal-method').textContent;
          const endpoint = document.getElementById('modal-endpoint').textContent;
          const headers = {
              'Content-Type': 'application/json',
              'Authorization': document.querySelector('input[name="authorization"]').value,
              'x-user-role': document.querySelector('input[name="x-user-role"]').value || 'user',
          };

          let url = endpoint;
          let body = null;
          let isValid = true;

          if (method === 'GET') {
              const params = {};
              currentApiParams.forEach(param => {
                  const input = document.querySelector(`#params-container input[name="${param.name}"]`);
                  if (param.required && (!input.value || input.value.trim() === '')) {
                      input.classList.add('input-error');
                      input.nextElementSibling.classList.remove('hidden');
                      isValid = false;
                  } else {
                      input.classList.remove('input-error');
                      input.nextElementSibling.classList.add('hidden');
                      if (input && input.value) {
                          params[param.name] = input.value;
                      }
                  }
              });
              if (!isValid) return;
              const queryString = new URLSearchParams(params).toString();
              if (queryString) {
                  url = `${endpoint}?${queryString}`;
              }
          } else if (method === 'POST') {
              const activeBodyTab = document.querySelector('.body-tab-button.active').dataset.bodyTab;
              let requestBody = {};

              if (activeBodyTab === 'form') {
                  currentApiParams.forEach(param => {
                      const input = document.querySelector(`#body-inputs input[name="${param.name}"]`);
                      if (param.required && (!input.value || input.value.trim() === '')) {
                          input.classList.add('input-error');
                          input.nextElementSibling.classList.remove('hidden');
                          isValid = false;
                      } else {
                          input.classList.remove('input-error');
                          input.nextElementSibling.classList.add('hidden');
                          if (input && input.value) {
                              requestBody[param.name] = input.value;
                          }
                      }
                  });
              } else if (activeBodyTab === 'raw') {
                  const rawInput = document.getElementById('raw-json-input').value;
                  try {
                      requestBody = JSON.parse(rawInput || '{}');
                      document.getElementById('raw-json-input').classList.remove('input-error');
                      document.querySelector('#body-raw-container .error-message').classList.add('hidden');
                  } catch (e) {
                      document.getElementById('raw-json-input').classList.add('input-error');
                      document.querySelector('#body-raw-container .error-message').classList.remove('hidden');
                      isValid = false;
                  }
              }

              if (!isValid) return;
              body = JSON.stringify(requestBody);
          }

          try {
              const startTime = performance.now();
              const response = await fetch(url, {
                  method: method,
                  headers: headers,
                  body: body,
              });
              const endTime = performance.now();
              const responseTime = Math.round(endTime - startTime);

              const data = await response.json();
              document.getElementById('modal-response').innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
              document.getElementById('modal-response-status').textContent = `Status: ${response.status} ${response.statusText}`;

              averageResponseTime = (averageResponseTime * responseTimeCount + responseTime) / (responseTimeCount + 1);
              responseTimeCount++;
              const change = Math.round(responseTime - averageResponseTime);
              document.getElementById('response-time').textContent = `${responseTime}ms`;
              document.getElementById('response-time-change').textContent = `${change >= 0 ? '+' : ''}${change}ms from average`;
          } catch (error) {
              document.getElementById('modal-response').innerHTML = `<pre>{ "error": "${error.message}" }</pre>`;
              document.getElementById('modal-response-status').textContent = 'Status: Error';
          }
      });

   
      function closeModal() {
          const modal = document.getElementById('api-test-modal');
          modal.classList.remove('active');
          setTimeout(() => {
              modal.classList.add('hidden');
          }, 300);
      }

      document.getElementById('close-modal-btn').addEventListener('click', closeModal);
      document.getElementById('api-test-modal').addEventListener('click', event => {
          if (event.target === document.getElementById('api-test-modal')) {
              closeModal();
          }
      });

  
      document.getElementById('notification-btn').addEventListener('click', async () => {
          const dropdown = document.getElementById('notification-dropdown');
          dropdown.innerHTML = '<p class="text-sm text-gray-400 p-4">Loading notifications...</p>';
          dropdown.classList.add('active');

          await fetchSettings();

          dropdown.innerHTML = '';
          if (settingsData.notifications && settingsData.notifications.length > 0) {
              settingsData.notifications.forEach(notification => {
                  const item = document.createElement('div');
                  item.className = 'notification-item';
                  item.innerHTML = `
                      <h4 class="text-sm font-medium text-white">${notification.title}</h4>
                      <p class="text-xs text-gray-400">${notification.message}</p>
                  `;
                  dropdown.appendChild(item);
              });
          } else {
              dropdown.innerHTML = '<p class="text-sm text-gray-400 p-4">No notifications available.</p>';
          }
      });

   
      document.addEventListener('click', event => {
          const dropdown = document.getElementById('notification-dropdown');
          const btn = document.getElementById('notification-btn');
          if (!btn.contains(event.target) && !dropdown.contains(event.target)) {
              dropdown.classList.remove('active');
          }
      });


      document.getElementById('help-support-link').addEventListener('click', async event => {
          event.preventDefault();

          document.getElementById('dashboard-overview').classList.add('hidden');
          document.getElementById('api-categories').classList.add('hidden');
          document.getElementById('api-list-section').classList.add('hidden');
          document.getElementById('help-support-section').classList.remove('hidden');

          document.getElementById('support-image').src = '';
          document.getElementById('support-status').textContent = 'Loading...';
          document.getElementById('support-operator').textContent = 'Loading...';
          document.getElementById('support-name').textContent = 'Loading...';
          document.getElementById('support-description').textContent = 'Loading...';
          document.getElementById('support-links').innerHTML = '';

          await fetchSettings();

          document.getElementById('support-image').src = settingsData.header?.imageSrc?.[0] || '';
          document.getElementById('support-status').textContent = settingsData.header?.status || 'N/A';
          document.getElementById('support-operator').textContent = settingsData.apiSettings?.operator || 'N/A';
          document.getElementById('support-name').textContent = settingsData.name || 'N/A';
          document.getElementById('support-description').textContent = settingsData.description || 'N/A';

          const linksContainer = document.getElementById('support-links');
          linksContainer.innerHTML = '';
          if (settingsData.links && settingsData.links.length > 0) {
              settingsData.links.forEach(link => {
                  const btn = document.createElement('a');
                  btn.href = link.url;
                  btn.target = '_blank';
                  btn.className = 'px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700';
                  btn.textContent = link.name;
                  linksContainer.appendChild(btn);
              });
          } else {
              linksContainer.innerHTML = '<p class="text-sm text-gray-400">No links available.</p>';
          }

          document.getElementById('sidebar').classList.remove('active');
          document.getElementById('overlay').classList.remove('active');
      });

 
      document.getElementById('back-to-dashboard').addEventListener('click', () => {
          document.getElementById('dashboard-overview').classList.remove('hidden');
          document.getElementById('api-categories').classList.remove('hidden');
          document.getElementById('api-list-section').classList.add('hidden');
          document.getElementById('help-support-section').classList.add('hidden');
      });

   
      document.getElementById('method-filter').addEventListener('change', filterApis);
      document.getElementById('sort-filter').addEventListener('change', filterApis);

      function filterApis() {
          const methodFilter = document.getElementById('method-filter').value;
          const sortFilter = document.getElementById('sort-filter').value;
          const activeCategoryElement = document.querySelector('.api-list:not(.hidden)');

          if (!activeCategoryElement) {
              console.warn('No active category found for filtering APIs.');
              return;
          }

          const activeCategory = activeCategoryElement.id.replace('-apis', '');
          const categoryApis = apiData.categories[activeCategory];

          if (!categoryApis || categoryApis.length === 0) {
              console.warn(`No APIs found for category: ${activeCategory}`);
              const listDiv = document.getElementById(`${activeCategory}-apis`);
              listDiv.innerHTML = '<p class="text-sm text-gray-400">No APIs available.</p>';
              return;
          }

          let filteredApis = [...categoryApis];

          if (methodFilter !== 'All Methods') {
              filteredApis = filteredApis.filter(api => api.method === methodFilter);
          }

          if (sortFilter === 'Sort by Name') {
              filteredApis.sort((a, b) => a.name.localeCompare(b.name));
          } else if (sortFilter === 'Sort by Method') {
              filteredApis.sort((a, b) => a.method.localeCompare(b.method));
          }

          const listDiv = document.getElementById(`${activeCategory}-apis`);
          listDiv.innerHTML = '';

          const grid = document.createElement('div');
          grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

          if (filteredApis.length === 0) {
              grid.innerHTML = '<p class="text-sm text-gray-400">No APIs match the selected filters.</p>';
          } else {
              filteredApis.forEach(api => {
                  const card = document.createElement('div');
                  card.className = 'p-4 rounded-lg border border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer api-card';
                  card.dataset.api = api.name.toLowerCase().replace(/\s+/g, '-');
                  card.dataset.endpoint = api.endpoint;
                  card.dataset.method = api.method;
                  card.dataset.category = activeCategory;

                  const responseTime = api.responseTime || Math.floor(Math.random() * 100 + 100);

                  card.innerHTML = `
                      <div class="flex items-center justify-between mb-3">
                          <h4 class="font-semibold text-white">${api.name}</h4>
                          <span class="px-2 py-1 ${
                              api.method === 'GET' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'
                          } text-xs font-medium rounded">${api.method}</span>
                      </div>
                      <p class="text-sm text-gray-400 mb-3">${api.name} API</p>
                      <div class="text-xs text-gray-400 font-mono bg-gray-700/50 p-2 rounded mb-3">${api.endpoint}</div>
                      <div class="flex items-center justify-between">
                          <div class="flex items-center text-sm text-gray-400">
                              <i class="fa-solid fa-clock mr-1 text-xs"></i>
                              ${responseTime}ms avg
                          </div>
                          <button class="text-purple-400 hover:text-purple-300 text-sm font-medium">Test API</button>
                      </div>
                  `;
                  grid.appendChild(card);
              });
          }

          listDiv.appendChild(grid);
      }


      (async () => {
          await fetchApiData();
          await fetchSettings();
          updateClockAndStats();
          setInterval(updateClockAndStats, 1000);
      })();